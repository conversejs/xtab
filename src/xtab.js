/**
 * @description This module provides the XTab class, which is used for
 * inter-tab communication and for electing a primary tab.
 * @copyright 2020, Fastmail Pty Ltd and JC Brand
 * @license MIT
 */

import { Events } from '@converse/skeletor/src/events.js';

const BROADCAST_KEY = 'converse/xtab-event';


/**
 * The XTab class provides an API for communicating between tabs and for
 * automatically electing a primary tab.
 *
 * Having a primary (or "master") tab is useful when you want to maintain a
 * single websocket or push connection, or if you want to have at least one
 * such connection.
 *
 * This class is inspired by the WindowController class, by Fastmail Pty Ltd.
 */
export default class XTab {

    /**
     * Creates a new XTab instance
     * @param { String } [broadcastkey='converse/xtab-event'] The key to use for
     *  the local storage property that will be set to broadcast messages to other tabs.
     */
    constructor (broadcastkey=BROADCAST_KEY) {
        // A unique id for the window, guaranteed to be different than for any
        // other open window.
        this.id = XTab.generateId();
        this.isFocused = document.hasFocus ? document.hasFocus() : true;
        this._isMaster = false;
        this.broadcastkey = broadcastkey;

        this._seenTabs = {};
        this._checkTimeout = null;
        this._pingTimeout = null;
    }

    static generateId () {
        return (new Date()).toISOString() + Math.random();
    }

    set isMaster (value) {
        if (this._isMaster !== value) {
            this._isMaster = value;
            this.trigger('isMaster', { tabxid: this.id, 'value': this._isMaster });
        }
    }

    /**
     * isMaster
     * @type { Boolean }
     *   Is this tab/window the elected master? If multiple windows with the
     *   application are open, they will coordinate between themselves so only
     *   one has the isMaster property set to true. Note, in some circumstances,
     *   this may not happen instantly and there may be a short while when there
     *   is no master or more than one master. However, it will quickly resolve
     *   itself.
     */
    get isMaster () {
         return this._isMaster;
    }

    handleEvent (ev) {
        switch (ev.type) {
            case 'storage':
                this.onStorage(ev);
                break;
            case 'unload':
                this.unload();
                break;
            case 'focus':
                this.isFocused = true;
                break;
            case 'blur':
                this.isFocused = false;
                break;
        }
    }

    onStorage (ev) {
        if (ev.key === this.broadcastkey) {
            const data = JSON.parse(ev.newValue);
            if (data.tabxid !== this.id ) {
                this.trigger(data.type, data);
            }
        }
    }

    unload () {
        window.removeEventListener('storage', this);
        window.removeEventListener('unload', this);
        window.removeEventListener('focus', this);
        window.removeEventListener('blur', this);
        this._checkTimeout && clearTimeout(this._checkTimeout);
        this._pingTimeout && clearTimeout(this._pingTimeout);
        this.off();
        this.broadcast('tabx:bye');
    }

    start () {
        window.addEventListener('storage', this);
        window.addEventListener('unload', this);

        this.broadcast('tabx:hello');

        const check = () => {
            this.checkMaster();
            this._checkTimeout = setTimeout(check, 9000);
        };
        const ping = () => {
            this.sendPing();
            this._pingTimeout = setTimeout(ping, 17000);
        };
        this._checkTimeout = setTimeout(check, 500);
        this._pingTimeout = setTimeout(ping, 17000);

        this.on('tabx:ping', event => this.onPing(event));
        this.on('tabx:bye', event => {
            delete this._seenTabs[event.tabxid];
            this.checkMaster();
        });

        this.on('tabx:hello', event => {
            this.onPing(event);
            if (event.tabxid < this.id) {
                this.checkMaster();
            } else {
                this.sendPing();
            }
        });
    }

    sendPing () {
        this.broadcast('tabx:ping');
    }

    onPing (event) {
        this._seenTabs[event.tabxid] = Date.now();
    }

    /**
     * Broadcast an event with JSON-serialisable data to other tabs.
     * @method XTab#broadcast
     * @param  { String } type - The name of the event being broadcast
     * @param { Object } [data] - The data to broadcast
     */
    broadcast (type, data={}) {
        localStorage.setItem(this.broadcastkey, JSON.stringify(Object.assign({tabxid: this.id, type}, data)));
    }

    /**
     * Looks at the set of other windows it knows about and sets the isMaster
     * property based on whether this window has the lowest ordered id.
     * @method XTab#checkMaster
     */
    checkMaster () {
        const now = Date.now();
        let isMaster = true;
        const seenWCs = this._seenTabs;
        const ourId = this.id;
        for (const id in seenWCs) {
            if (seenWCs[id] + 23000 < now) {
                delete seenWCs[id];
            } else if (id < ourId ) {
                isMaster = false;
            }
        }
        this.isMaster = isMaster;
    }
}

Object.assign(XTab.prototype, Events);
