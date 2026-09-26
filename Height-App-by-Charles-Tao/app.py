from flask import Flask, render_template, request, jsonify
from height import normalize_gender, to_cm, predict_height as predict_height_impl

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# Note: the C++ runner (/run) was removed to keep this service focused on
# the height prediction feature. Removing compilation/execution of arbitrary
# user-submitted code improves safety for a single-purpose demo service.


@app.route('/height', methods=['POST'])
def predict_height():
    # Accept JSON or form data
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    gender = normalize_gender(data.get('gender', ''))
    father_h = to_cm(data.get('father_height'), data.get('father_unit'))
    mother_h = to_cm(data.get('mother_height'), data.get('mother_unit'))

    # Basic validation
    if gender == '':
        return jsonify({'error': '无法解析的性别 (gender)'}), 400
    if father_h is None or mother_h is None:
        return jsonify({'error': '父母身高必须为数字'}), 400

    try:
        res = predict_height_impl(gender, father_h, mother_h)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    return jsonify(res)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})
if __name__ == '__main__':
    # Production-friendly launch: read host/port/debug from environment.
    # When running under a WSGI server (gunicorn, waitress) this block is
    # ignored and the server should import `hp_web_runner.app:app` directly.
    import os
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') in ('1', 'true', 'True')
    # Disable the reloader when starting in background to avoid termios errors
    use_reloader = False
    app.run(host=host, port=port, debug=debug, use_reloader=use_reloader)
