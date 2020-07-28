KARMA	?= ./node_modules/.bin/karma
XTAB 	?= dist/xtab.js


.PHONY: dist
dist: $(XTAB)

$(XTAB): src rollup.config.js node_modules Makefile
	npm run build

node_modules: package.json package-lock.json
	npm i

.PHONY: check
check: node_modules
	$(KARMA) start karma.conf.js $(ARGS)
