/*global describe, it, expect, beforeEach, XTab */


function getResolveablePromise () {
    const wrapper = {
        isResolved: false,
        isPending: true,
        isRejected: false
    };
    const promise = new Promise((resolve, reject) => {
        wrapper.resolve = resolve;
        wrapper.reject = reject;
    })
    Object.assign(promise, wrapper);
    promise.then(
        function (v) {
            promise.isResolved = true;
            promise.isPending = false;
            promise.isRejected = false;
            return v;
        },
        function (e) {
            promise.isResolved = false;
            promise.isPending = false;
            promise.isRejected = true;
            throw (e);
        }
    );
    return promise;
}


function clearTimers(timeout, interval) {
    clearTimeout(timeout);
    clearInterval(interval);
}


function waitUntil (func, max_wait=300, check_delay=3) {
    // Run the function once without setting up any listeners in case it's already true
    try {
        const result = func();
        if (result) {
            return Promise.resolve(result);
        }
    } catch (e) {
        return Promise.reject(e);
    }

    const promise = getResolveablePromise();
    const timeout_err = new Error();

    function checker () {
        try {
            const result = func();
            if (result) {
                clearTimers(max_wait_timeout, interval);
                promise.resolve(result);
            }
        } catch (e) {
            clearTimers(max_wait_timeout, interval);
            promise.reject(e);
        }
    }

    const interval = setInterval(checker, check_delay);

    function handler () {
        clearTimers(max_wait_timeout, interval);
        const err_msg = `Wait until promise timed out: \n\n${timeout_err.stack}`;
        console.trace();
        console.error(err_msg);
        promise.reject(new Error(err_msg));
    }

    const max_wait_timeout = setTimeout(handler, max_wait);
    return promise;
}


function runInIframe (iframe, fn) {
    const args = [].slice.call(arguments, 2);
    return iframe.contentWindow.window.eval(`(${fn}).apply(window, ${JSON.stringify(args)});`);
}

function runWhenReady (onload) {
    let done;
    return () => {
        if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
            done = true;
            this.onload = this.onreadystatechange = null;
            onload();
        }
    };
}

function xtabOnload (iframe) {
    for (let i = 0; i < iframe.onloadqueue.length; i++) {
        iframe.run(iframe.onloadqueue[i]);
    }
    iframe.onloadqueue = { push: iframe.run };
}

function evalFunc (fn, args) {
    Function(`return ${fn};`)().apply(null, args); // eslint-disable-line no-new-func
}

function setupIframe (onload) {
    const iframe = document.createElement('iframe');
    iframe.id = XTab.generateId();
    iframe.src = "/base/test/iframe.html";

    iframe.onloadqueue = [];
    iframe.run = (fn, ...args) => runInIframe(iframe, evalFunc, fn.toString(), args);
    iframe.onloadqueue.push(onload);

    iframe.onload = iframe.onreadystatechange = runWhenReady(function () {
        iframe.run(() => {
            window.addFeedback = (txt) => {
                const div = document.querySelector('#feedback');
                div.appendChild(document.createTextNode(txt))
                div.appendChild(document.createElement('br'));
            }
            window.addFeedback('iframe loaded');
        });
        xtabOnload(iframe);
    });

    document.body.appendChild(iframe);
    return iframe;
}

function removeIframes () {
    Array.from(document.querySelectorAll('iframe'))
      .forEach(iframe => document.body.removeChild(iframe));
}


describe("A tab", function () {
    beforeEach(done => {
        removeIframes();
        done();
    });

    it('receives broadcasts from other tabs', async function (done) {
        const promise = window.promise = getResolveablePromise();
        const iframe = setupIframe(function () {
            window.xtab = new XTab();
            window.xtab.start();
            window.addFeedback('xtab started');
            window.parent.promise.resolve();
        });
        await promise;
        const xtab = new XTab();
        xtab.start();
        const msg = "Hello from the other side!";
        xtab.once('message', data => {
            expect(data.msg).toBe(msg);
            done();
        });
        iframe.run(msg => window.xtab.broadcast('message', { msg }), msg);
    });

    it("is designated the master tab when it's the first tab", async function (done) {
        const xtab = new XTab();
        xtab.start();
        await waitUntil(() => xtab.isMaster, 501);
        const iframe_promise = window.promise = getResolveablePromise();
        const iframe = setupIframe(function () {
            window.xtab = new XTab();
            window.xtab.start();
            window.addFeedback('xtab started');
            window.parent.promise.resolve();
        });
        await iframe_promise;

        const is_iframe_master_promise = getResolveablePromise();
        xtab.once('isIframeMaster', data => {
            // The parent tab is the master
            expect(xtab.isMaster).toBe(true);
            // The iframe is not the master
            expect(data.value).toBe(false);
            is_iframe_master_promise.resolve();
        });
        iframe.run(() => window.xtab.broadcast('isIframeMaster', { 'value': window.xtab.isMaster }));
        await is_iframe_master_promise;
        // Simulate closing of the master tab
        xtab.unload();
        await waitUntil(() => iframe.contentWindow.xtab.isMaster, 500);
        done();
    });
});
