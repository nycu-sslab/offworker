# Offworker: An Offloading Framework for Parallel Web Applications

Official source code for the thesis, "[Offworker: An Offloading Framework for ParallelWeb Applications](https://etd.lib.nctu.edu.tw/cgi-bin/gs32/tugsweb.cgi?o=dnctucdr&s=id=%22GT0708560050%22.&switchlang=en)," authored by Liu, An-Chi and You, Yi-Ping.

<img width="728" alt="Offworker Architecture" src="https://user-images.githubusercontent.com/18013815/180620872-54505fd2-eba8-446c-9f90-72bb86ddde23.png">


## Setup

Tested in Ubuntu, but other Linux distributions may also work.

```
$ sudo apt install g++ make curl unzip wget
```

Installed Node.js 14 by NVM. Install NVM first:


```sh
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
```

Reopen the shell, and install Node.js 14, note that Offworker only work with Node.js 14:

```
$ nvm install 14
$ nvm use 14
```

Install Node.js dependencies, build and run tests for both front-end and back-end:


```sh
$ make
```

## Run

### Back-end Manager

The default port is `8080`. You can change at `offworker/backend/src/config.ts`

```sh
$ cd backend
$ npm run dev # dev mode
```
    
Now the back-end manager is running, use Chrome to open `http://{http_server_ip}:8080` (e.g. http://localhost:8080), you should see `Upgrade Required` in the page.
    
### Example

Copy the built front-end library to the example. Once you include Offworker front-end library at the beginning in the application, Offworker's front-end manager will start to work automatically.

```
$ cp frontend/build/offworker.bundle.js example/pi-proxy
```

Run the HTTP server, which uses `8081` port by default:

```
$ cd example; node http-server.js
```

Use Chrome to open `http://{http_server_ip_port}/pi-proxy/index.html?host={offworker_backend_ip_port}` (e.g. http://localhost:8081/pi-proxy/index.html?host=localhost:8080). Offworker will recognize the `host` flag and connect to the back-end manager.

You should see the result with Offworker: 

```
pi: 3.141592653589782
time: 5.999s
```

You may also want to see the logs in the Chrome console.

You can also turn off Offworker by `offload=false` flag, open `http://localhost:8081/pi-proxy/index.html?offload=false`.

If you run the example natively on a slow device (usually a smartphone) and offload workers to a high-performance machine (server), you will see the performance dramatically become better.

## Benchmark

Offworker use two benchmark suites for evaluation, which are [Rodinia-JS](https://github.com/nycu-sslab/rodinia-js) and [Hopscotch-JS](https://github.com/nycu-sslab/hopscotch-js).

## Citation

If you use **Offworker** for academical purpose, please cite the followings:

Liu, An-Chi and You, Yi-Ping, "Offworker: An Offloading Framework for Parallel Web Applications," M.S. thesis, Institute of Computer Science and Engineering, National Yang Ming Chiao Tung University, Hsinchu, Taiwan, 2022. [Online]. Available: https://etd.lib.nctu.edu.tw/cgi-bin/gs32/tugsweb.cgi?o=dnctucdr&s=id=%22GT0708560050%22.&switchlang=en

## License

MIT
