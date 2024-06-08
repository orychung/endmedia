REM openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
setlocal
set "CONF=%~1"
if not defined CONF set "CONF=example.conf"

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 730 -config %CONF%
