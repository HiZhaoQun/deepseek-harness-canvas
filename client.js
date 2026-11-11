/**
 * Client half of DeepSeek Harness Canvas.
 *
 * This file is intentionally tiny: it registers the conversation View and
 * lazy-loads the real canvas application from same-origin Host assets. Keeping
 * the app in native ES modules avoids a build step, avoids bundling a second
 * copy of React, and keeps the canvas application tree-shakeable from the
 * plugin's point of view.
 */
;(() => {
const APP_BASE = '/deepseek-canvas/assets/'
const APP_VERSION = '2'

window.__ModuleLoader__.load({
  id: 'deepseek-harness-canvas',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'deepseekCanvas'

    // The lazy-loaded ES modules receive React through this page-local slot.
    globalThis.__DEEPSEEK_CANVAS_REACT__ = React

    const dictionaries = {
      en: {
        'view.label': 'Canvas',
        'boot.loading': 'Opening canvas…',
        'boot.error': 'The canvas application could not be loaded.',
        'boot.retry': 'Retry',
      },
      zh: {
        'view.label': '画布',
        'boot.loading': '正在打开画布…',
        'boot.error': '画布应用加载失败。',
        'boot.retry': '重试',
      },
    }

    let appPromise
    function loadApp() {
      if (appPromise === undefined) {
        appPromise = import(`${APP_BASE}app.js?v=${APP_VERSION}`)
      }
      return appPromise
    }

    const LazyCanvas = React.lazy(async () => {
      try {
        const module = await loadApp()
        return { default: module.CanvasView }
      } catch (error) {
        console.error('[deepseek-canvas] app import failed', error)
        throw error
      }
    })

    class CanvasBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error) {
        console.error('[deepseek-canvas] render failed', error)
      }

      render() {
        if (this.state.error !== null) {
          const message = this.state.error instanceof Error
            ? this.state.error.message
            : String(this.state.error)
          return h('div', {
            className: 'dc-boot dc-boot-error',
            role: 'alert',
          }, h('div', { className: 'dc-boot-title' }, 'DeepSeek Harness Canvas'), h('div', null, message))
        }
        return this.props.children
      }
    }

    function CanvasSlot(props) {
      return h(CanvasBoundary, null,
        h(React.Suspense, {
          fallback: h('div', { className: 'dc-boot', role: 'status' },
            h('span', { className: 'dc-boot-spinner', 'aria-hidden': true }),
            h('span', null, 'Opening canvas…'),
          ),
        }, h(LazyCanvas, props)),
      )
    }

    return {
      inject: ['slots', 'remote', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          try {
            return ctx.locale.register(NS, dictionaries)
          } catch (error) {
            // A stale dictionary from a previous page generation must not stop
            // the View from registering.
            console.error('[deepseek-canvas] locale registration failed', error)
            return () => {}
          }
        }, 'deepseek-canvas: locale')
        let t = (key) => key
        try {
          t = ctx.locale.bind(NS)
        } catch (error) {
          console.error('[deepseek-canvas] locale bind failed', error)
        }
        const label = () => {
          try {
            const text = t('view.label')
            return typeof text === 'string' && text !== 'view.label' ? text : 'Canvas'
          } catch {
            return 'Canvas'
          }
        }
        function BoundCanvas(props) {
          return h(CanvasSlot, { ...props, pluginCtx: ctx })
        }
        ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view',
          id: 'deepseek-canvas',
          order: 20,
          label,
        }, BoundCanvas))
      },
    }
  },
})
})()

