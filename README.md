For detailed documentation , browse to [docs](https://open-amt-cloud-toolkit.github.io/MPS/)

Running from Docker

```
docker build --tag mps .
```

```
docker run -d \
  --name=mps \
  -v="$(pwd)/private:/mps-microservice/private" \
  -p 4433:4433 \
  -p 3000:3000 \
  mps:latest
```