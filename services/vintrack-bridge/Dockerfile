FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /vintrack-bridge .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates
COPY --from=build /vintrack-bridge /usr/local/bin/vintrack-bridge
USER 65532:65532
ENTRYPOINT ["vintrack-bridge"]
