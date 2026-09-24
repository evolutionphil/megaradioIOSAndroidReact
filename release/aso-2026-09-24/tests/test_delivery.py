"""Verify replacement safety with a fake Apple service; never contacts Apple."""
import copy
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('delivery', ROOT / 'asc-release.py')
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)


def shot(identifier, checksum, state='COMPLETE'):
    return {'id': identifier, 'attributes': {'sourceFileChecksum': checksum,
        'assetDeliveryState': {'state': state}, 'uploadOperations': []}}


class FakeApple:
    def __init__(self, existing, failure=None):
        self.shots = copy.deepcopy(existing)
        self.failure = failure
        self.mutations = []

    def all(self, path, **kwargs):
        return copy.deepcopy(self.shots)

    def request(self, method, path, **kwargs):
        self.mutations.append((method, path))
        if method == 'POST':
            item = shot('new-' + str(len(self.shots)), None, 'AWAITING_UPLOAD')
            item['attributes'].update(kwargs['json']['data']['attributes'])
            self.shots.append(item)
            return {'data': copy.deepcopy(item)}
        if method == 'DELETE':
            # Existing assets must survive until every replacement is processed.
            target = next(x for x in self.shots if x['id'] == path.rsplit('/', 1)[1])
            if target['attributes']['assetDeliveryState']['state'] == 'COMPLETE':
                new = [x for x in self.shots if x['id'].startswith('new-')]
                assert new and all(x['attributes']['assetDeliveryState']['state'] == 'COMPLETE' for x in new)
            self.shots = [x for x in self.shots if x['id'] != path.rsplit('/', 1)[1]]
        elif method == 'PATCH':
            by_id = {x['id']: x for x in self.shots}
            self.shots = [by_id[x['id']] for x in kwargs['json']['data']]

    def patch(self, kind, identifier, attrs):
        self.mutations.append(('COMMIT', identifier))
        item = next(x for x in self.shots if x['id'] == identifier)
        item['attributes'].update(attrs)
        item['attributes']['assetDeliveryState']['state'] = 'FAILED' if self.failure == 'processing' else 'COMPLETE'
        if self.failure == 'checksum':
            item['attributes']['sourceFileChecksum'] = 'wrong-checksum'


class DeliverySafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.assets = Path(self.temp.name)
        folder = self.assets / 'en-US' / 'mac'
        folder.mkdir(parents=True)
        self.checksums = []
        for n in (1, 2):
            data = ('validated-image-' + str(n)).encode()
            (folder / f'{n:02}.png').write_bytes(data)
            self.checksums.append(hashlib.md5(data).hexdigest())
        self.addCleanup(self.temp.cleanup)

    def deliver(self, api, refresh_stalled=False):
        sets = [{'id': 'set-1', 'attributes': {'screenshotDisplayType': 'APP_DESKTOP'}}]
        with patch.object(delivery, 'ASSETS', self.assets), patch.object(delivery.client, 'ASC', return_value=api), \
             patch.object(delivery, 'backup'), patch.object(delivery.time, 'sleep'):
            return delivery.deliver_set(('MAC_OS', 'en-US', 'localization-1', 'mac', 'APP_DESKTOP', sets), True, refresh_stalled)

    def test_processed_matching_images_are_reused_without_mutation(self):
        api = FakeApple([shot(str(n), c) for n, c in enumerate(self.checksums)])
        self.assertTrue(self.deliver(api)['verified'])
        self.assertEqual(api.mutations, [])

    def test_replacement_preserves_old_assets_until_new_assets_are_ready(self):
        api = FakeApple([shot('old', 'old-checksum')])
        self.assertTrue(self.deliver(api)['verified'])
        self.assertEqual(len(api.shots), 2)
        self.assertNotIn('old', [x['id'] for x in api.shots])

    def test_processing_failure_never_deletes_originals(self):
        api = FakeApple([shot('old', 'old-checksum')], 'processing')
        with self.assertRaisesRegex(RuntimeError, 'processing failed'):
            self.deliver(api)
        self.assertFalse(any(method == 'DELETE' for method, _ in api.mutations))

    def test_bad_checksum_never_deletes_originals(self):
        api = FakeApple([shot('old', 'old-checksum')], 'checksum')
        self.assertIn('error', self.deliver(api))
        self.assertFalse(any(method == 'DELETE' for method, _ in api.mutations))

    def test_existing_images_are_ordered_without_reupload(self):
        api = FakeApple([shot(str(n), c) for n, c in reversed(list(enumerate(self.checksums)))])
        self.assertTrue(self.deliver(api)['verified'])
        self.assertEqual([x['id'] for x in api.shots], ['0', '1'])
        self.assertFalse(any(method in ('POST', 'DELETE', 'COMMIT') for method, _ in api.mutations))

    def test_uploaded_bytes_are_finalized_after_interrupted_commit(self):
        pending = shot('pending', None, 'UPLOAD_COMPLETE')
        pending['attributes']['fileName'] = f'MegaRadio-en-US-mac-{self.checksums[0][:10]}-01.png'
        api = FakeApple([pending, shot('second', self.checksums[1])])
        self.assertTrue(self.deliver(api)['verified'])
        self.assertIn(('COMMIT', 'pending'), api.mutations)
        self.assertFalse(any(method in ('POST', 'DELETE') for method, _ in api.mutations))

    def test_stalled_reservation_can_be_replaced_without_removing_original(self):
        pending = shot('pending', None, 'UPLOAD_COMPLETE')
        pending['attributes']['fileName'] = f'MegaRadio-en-US-mac-{self.checksums[0][:10]}-01.png'
        api = FakeApple([shot('old', 'original-checksum'), pending, shot('second', self.checksums[1])], 'processing')
        with self.assertRaisesRegex(RuntimeError, 'processing failed'):
            self.deliver(api, refresh_stalled=True)
        self.assertIn('old', [x['id'] for x in api.shots])
        self.assertNotIn('pending', [x['id'] for x in api.shots])


if __name__ == '__main__':
    unittest.main()
