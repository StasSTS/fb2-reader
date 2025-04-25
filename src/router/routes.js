import BookShelf from 'components/BookShelf.vue'
import BookReader from 'components/BookReader.vue'

const routes = [
  {
    path: '/',
    component: BookShelf
  },
  {
    path: '/reader',
    name: 'reader',
    component: BookReader
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
