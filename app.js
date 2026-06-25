// ==UserScript==
// @name         小林coding 永久解除阅读全文限制
// @namespace    https://github.com/ZhoucpSAMA/fuck-xiaolingcoding-captcha
// @version      2.1
// @description  低干扰解除 TechGrow 阅读限制，避免反复处理导致滚动位置跳回
// @author       codex
// @match        *://xiaolincoding.com/*
// @match        *://*.xiaolincoding.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'xiaolin-readmore-unlock-style';
    const READMORE_IDS = new Set([
        'readmore-container',
        'readmore-mask',
        'readmore-btn',
        'readmore-wrapper'
    ]);
    const READMORE_SELECTORS = [...READMORE_IDS].map(id => `#${id}`);

    function installStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const host = document.head || document.documentElement || document.body;
        if (!host) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #readmore-container {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
            }
            #readmore-mask,
            #readmore-btn,
            #readmore-wrapper {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `;
        host.appendChild(style);
    }

    function setImportantStyle(el, prop, value) {
        if (
            el.style.getPropertyValue(prop) !== value ||
            el.style.getPropertyPriority(prop) !== 'important'
        ) {
            el.style.setProperty(prop, value, 'important');
        }
    }

    function restoreScrollPosition(x, y) {
        const restore = () => {
            if (Math.abs(window.scrollX - x) > 1 || Math.abs(window.scrollY - y) > 1) {
                window.scrollTo(x, y);
            }
        };

        restore();
        requestAnimationFrame(restore);
        window.setTimeout(restore, 80);
    }

    // 只覆盖样式，不删除节点，避免和站点脚本反复拉扯造成滚动位置被重算。
    function unlock() {
        installStyle();

        const box = document.getElementById('readmore-container');
        if (box) {
            setImportantStyle(box, 'height', 'auto');
            setImportantStyle(box, 'max-height', 'none');
            setImportantStyle(box, 'overflow', 'visible');
        }

        ['readmore-mask', 'readmore-btn', 'readmore-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) {
                return;
            }

            setImportantStyle(el, 'display', 'none');
            setImportantStyle(el, 'visibility', 'hidden');
            setImportantStyle(el, 'pointer-events', 'none');
        });
    }

    function isReadmoreNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        const el = node;
        if (READMORE_IDS.has(el.id)) {
            return true;
        }

        return READMORE_SELECTORS.some(selector => el.querySelector?.(selector));
    }

    function shouldUnlock(mutations) {
        return mutations.some(mutation => {
            if (isReadmoreNode(mutation.target)) {
                return true;
            }

            return [...mutation.addedNodes].some(isReadmoreNode);
        });
    }

    let scheduled = false;
    function scheduleUnlock({ keepScroll = false } = {}) {
        if (scheduled) {
            return;
        }

        scheduled = true;
        const x = window.scrollX;
        const y = window.scrollY;

        requestAnimationFrame(() => {
            scheduled = false;
            unlock();

            if (keepScroll && (x || y)) {
                restoreScrollPosition(x, y);
            }
        });
    }

    // 只在阅读限制相关节点出现/变化时处理，避免页面普通渲染触发解锁逻辑。
    const obs = new MutationObserver(mutations => {
        if (shouldUnlock(mutations)) {
            scheduleUnlock({ keepScroll: true });
        }
    });
    obs.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class', 'style']
    });

    // 首屏与加载完成后各执行一次兜底。
    unlock();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => scheduleUnlock(), { once: true });
    } else {
        scheduleUnlock();
    }
})();
