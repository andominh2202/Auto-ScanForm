"""
FormMaster AI - Local Server & Google Forms Scanner Proxy
Cung cấp HTTP Server tĩnh kèm API quét & phân tích link Google Forms
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000

class FormMasterHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Hỗ trợ CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Endpoint quét form bằng link: /api/scan-form?url=...
        if parsed.path == '/api/scan-form':
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get('url', [''])[0]
            
            if not target_url:
                self.send_error(400, 'Missing url parameter')
                return
                
            try:
                # Tạo request với User-Agent chuẩn trình duyệt
                req = urllib.request.Request(
                    target_url,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    final_url = response.geturl()
                    html_content = response.read().decode('utf-8', errors='ignore')
                
                # Phân tích biến FB_PUBLIC_LOAD_DATA_ của Google Forms
                match = re.search(r'var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(.*?);\s*</script>', html_content, re.DOTALL)
                if not match:
                    res_data = {'success': False, 'error': 'Không tìm thấy dữ liệu Google Forms trong trang này.'}
                else:
                    raw_data = json.loads(match.group(1))
                    title = raw_data[1][8] or raw_data[1][0] or "Google Biểu mẫu"
                    description = raw_data[1][0] or ""
                    raw_items = raw_data[1][1] or []
                    
                    questions = []
                    for item in raw_items:
                        if not item or len(item) < 5 or not item[4] or not item[4][0]:
                            continue
                        q_title = item[1] or ""
                        q_type_id = item[3]
                        entry_meta = item[4][0]
                        entry_id = entry_meta[0]
                        
                        raw_opts = entry_meta[1] if len(entry_meta) > 1 and entry_meta[1] else []
                        options = [opt[0] if isinstance(opt, list) else opt for opt in raw_opts]
                        required = bool(entry_meta[2]) if len(entry_meta) > 2 else False
                        
                        type_str = 'short_text'
                        if q_type_id == 0: type_str = 'short_text'
                        elif q_type_id == 1: type_str = 'paragraph'
                        elif q_type_id == 2: type_str = 'multiple_choice'
                        elif q_type_id == 3: type_str = 'dropdown'
                        elif q_type_id == 4: type_str = 'checkbox'
                        elif q_type_id == 9: type_str = 'date'
                        elif q_type_id == 10: type_str = 'time'
                        
                        questions.append({
                            'entryId': str(entry_id),
                            'title': q_title,
                            'type': type_str,
                            'options': options,
                            'required': required
                        })
                    
                    res_data = {
                        'success': True,
                        'url': final_url,
                        'title': title,
                        'description': description,
                        'questions': questions
                    }
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(res_data, ensure_ascii=False).encode('utf-8'))
                return
                
            except Exception as e:
                import traceback
                print(f"[API ERROR] {e}", flush=True)
                traceback.print_exc()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                err_res = {'success': False, 'error': f'Lỗi khi tải URL: {str(e)}'}
                self.wfile.write(json.dumps(err_res, ensure_ascii=False).encode('utf-8'))
                return

        # Phục vụ file tĩnh thông thường
        super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('127.0.0.1', PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, FormMasterHandler)
    print(f"🚀 FormMaster Server running at http://127.0.0.1:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
