#!/bin/sh

case "$1" in
  type)
    curl -X 'POST' \
      'http://localhost:3000/testing-multi-part' \
      -H 'accept: */*' \
      -H 'Content-Type: multipart/form-data' \
      -F 'stringField=string' \
      -F 'jsonField={"mood":["string"]};type=application/json'
    ;;
  notype)
    curl -X 'POST' \
      'http://localhost:3000/testing-multi-part' \
      -H 'accept: */*' \
      -H 'Content-Type: multipart/form-data' \
      -F 'stringField=string' \
      -F 'jsonField={"mood":["string2"]}'
    ;;
  broken)
    curl -X 'POST' \
      'http://localhost:3000/testing-multi-part' \
      -H 'accept: */*' \
      -H 'Content-Type: multipart/form-data' \
      -F 'stringField=string' \
      -F 'jsonField={"}'
    ;;
  *)
    echo "Usage: $0 {type|notype|broken}"
    exit 1
    ;;
esac
