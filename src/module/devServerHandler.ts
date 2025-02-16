import {
  defineEventHandler,
  defaultContentType,
  setResponseHeader,
  getRequestURL,
} from 'h3'
import type { Collector } from './Collector'

export function createDevServerHandler(collector: Collector) {
  return defineEventHandler(async (event) => {
    defaultContentType(event, 'image/svg+xml')
    setResponseHeader(event, 'Cache-Control', 'max-age=99999999')

    const url = getRequestURL(event)
    const spriteName = url.pathname.split('/').slice(-2, -1)[0]

    const sprite = collector.sprites.find((v) => v.name === spriteName)
    if (!sprite) {
      return '<svg></svg>'
    }
    const { content } = await sprite.getSprite()
    return content
  })
}
