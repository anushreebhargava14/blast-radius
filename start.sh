#!/bin/sh

echo "Registering Coral sources..."

coral source add github || true
coral source add linear || true

echo "Configured sources:"
coral source list || true

npm start