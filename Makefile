all:
	make backend-install
	make backend-build
	make backend-test

	make frontend-install
	make frontend-build
	make frontend-test

backend-install:
	cd ./backend && npm install

frontend-install:
	cd ./frontend && npm install

backend-build:
	cd ./backend && npm run build

frontend-build:
	cd ./frontend && npm run build

backend-test:
	cd ./backend && npm test && npm run coverage

frontend-test:
	cd ./frontend && npm test && npm run coverage

backend-run:
	cd ./backend && npm start

clean:
	rm -rf ./backend/.nyc_output ./backend/dist \
		./backend/coverage ./frontend/build ./frontend/dist \
		./frontend/.nyc_output ./frontend/coverage