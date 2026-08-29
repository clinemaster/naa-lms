import os
import re

from django.http import StreamingHttpResponse, HttpResponse, HttpResponseNotFound
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

RANGE_RE = re.compile(r'bytes\s*=\s*(\d+)?\s*-\s*(\d+)?', re.IGNORECASE)
CHUNK_SIZE = 1024 * 1024  # 1MB

VIDEO_SIGNER_SALT = 'naa-lms.video-access'
VIDEO_TOKEN_MAX_AGE = 600  # seconds


def make_video_token(variant_item_id, user_id):
    signer = TimestampSigner(salt=VIDEO_SIGNER_SALT)
    return signer.sign(f"{variant_item_id}:{user_id}")


def read_video_token(token, max_age=VIDEO_TOKEN_MAX_AGE):
    """Returns (variant_item_id, user_id) or raises BadSignature/SignatureExpired."""
    signer = TimestampSigner(salt=VIDEO_SIGNER_SALT)
    value = signer.unsign(token, max_age=max_age)
    variant_item_id, user_id = value.split(':')
    return int(variant_item_id), int(user_id)


def _file_iterator(file_path, start, length):
    with open(file_path, 'rb') as f:
        f.seek(start)
        remaining = length
        while remaining > 0:
            chunk = f.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def serve_ranged_file(request, file_path, content_type='video/mp4'):
    if not os.path.exists(file_path):
        return HttpResponseNotFound("Video file not found.")

    file_size = os.path.getsize(file_path)
    range_header = request.META.get('HTTP_RANGE', '')
    match = RANGE_RE.match(range_header) if range_header else None

    if not match:
        response = StreamingHttpResponse(_file_iterator(file_path, 0, file_size), content_type=content_type)
        response['Content-Length'] = str(file_size)
        response['Accept-Ranges'] = 'bytes'
        return response

    start_str, end_str = match.groups()
    start = int(start_str) if start_str else 0
    end = int(end_str) if end_str else file_size - 1
    end = min(end, file_size - 1)

    if start > end or start >= file_size:
        response = HttpResponse(status=416)
        response['Content-Range'] = f'bytes */{file_size}'
        return response

    length = end - start + 1
    response = StreamingHttpResponse(
        _file_iterator(file_path, start, length),
        status=206,
        content_type=content_type,
    )
    response['Content-Length'] = str(length)
    response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
    response['Accept-Ranges'] = 'bytes'
    return response
