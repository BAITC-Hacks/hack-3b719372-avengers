import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch, Mock

import requests
from fastapi import HTTPException
from openai import APITimeoutError

from backend import products, main


class CatalogTests(unittest.TestCase):
    def setUp(self):
        products._catalog_cache.clear()

    def test_concurrent_searches_share_cache_and_preserve_ranking(self):
        def page(number):
            return [{'id': number, 'name': 'Legrand 16A' if number == 2 else 'Legrand', 'article': str(number)}]
        with patch.object(products, 'get_products', side_effect=page) as fetch:
            with ThreadPoolExecutor(max_workers=4) as pool:
                results = list(pool.map(lambda _: products.search_products('Legrand 16A', 3), range(4)))
            self.assertEqual(fetch.call_count, 3)
            self.assertTrue(all(result[0]['id'] == 2 for result in results))
            self.assertNotIn('_search_score', products._catalog_cache[3][1][0])

    def test_expiration_refreshes_and_failure_is_not_cached(self):
        with patch.object(products, 'get_products', return_value=[{'id': 1, 'name': 'Legrand'}]) as fetch:
            products.search_products('Legrand', 1)
            timestamp, data = products._catalog_cache[1]
            products._catalog_cache[1] = (timestamp - products.CATALOG_TTL - 1, data)
            fetch.side_effect = requests.Timeout('private upstream detail')
            with self.assertRaises(requests.Timeout):
                products.search_products('Legrand', 1)
            fetch.side_effect = None
            self.assertEqual(len(products.search_products('Legrand', 1)), 1)
            self.assertEqual(fetch.call_count, 3)


class ChatErrorsTests(unittest.TestCase):
    def test_dependency_errors_have_safe_distinct_statuses(self):
        cases = [(requests.Timeout('secret'), 504),
                 (APITimeoutError(request=Mock()), 504),
                 (requests.ConnectionError('secret'), 502),
                 (ValueError('secret'), 500)]
        for error, status in cases:
            with self.subTest(status=status), patch.object(main, 'ask_agent', side_effect=error):
                with self.assertRaises(HTTPException) as caught:
                    main.chat(main.ChatRequest(message='test'))
                self.assertEqual(caught.exception.status_code, status)
                self.assertNotIn('secret', caught.exception.detail)


if __name__ == '__main__':
    unittest.main()
