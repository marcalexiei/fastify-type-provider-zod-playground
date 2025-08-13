curl -X 'POST' \
  'http://localhost:5173/testing-multi-part' \
  -H 'accept: */*' \
  -H 'Content-Type: multipart/form-data' \
  -F 'html=string' \
  -F 'anotherField={"mood":["string"]};type=application/json'


  curl -X 'POST' \
  'http://localhost:5173/testing-multi-part' \
  -H 'accept: */*' \
  -H 'Content-Type: multipart/form-data' \
  -F 'html=string' \
  -F 'anotherField={"mood":["string"]}'


  curl -X 'POST' \
  'http://localhost:5173/testing-multi-part' \
  -H 'accept: */*' \
  -H 'Content-Type: multipart/form-data' \
  -F 'html=string' \
  -F 'anotherField={"}'