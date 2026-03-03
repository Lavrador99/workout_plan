import struct, zlib

def create_simple_png(size):
    w, h = size, size
    
    def png_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    
    row_data = b''
    for y in range(h):
        row_data += b'\x00'
        for x in range(w):
            margin = size // 6
            if margin < x < w-margin and margin < y < h-margin:
                row_data += bytes([14, 14, 14])
            else:
                row_data += bytes([30, 30, 30])
    
    compressed = zlib.compress(row_data, 9)
    
    png = b'\x89PNG\r\n\x1a\n'
    png += png_chunk(b'IHDR', ihdr_data)
    png += png_chunk(b'IDAT', compressed)
    png += png_chunk(b'IEND', b'')
    return png

import os
os.makedirs('/Users/alexandrelavrador/Desktop/treino-app/public/icons', exist_ok=True)
open('/Users/alexandrelavrador/Desktop/treino-app/public/icons/icon-192.png', 'wb').write(create_simple_png(192))
open('/Users/alexandrelavrador/Desktop/treino-app/public/icons/icon-512.png', 'wb').write(create_simple_png(512))
print('Icons created')
