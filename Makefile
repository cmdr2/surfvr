all:
	mkdir -p build
	zip -r build/surfvr-1-howlingwolf.xpi *

clean:
	rm -r build
