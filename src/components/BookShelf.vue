<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          Моя библиотека
        </q-toolbar-title>
        <q-btn
          color="white"
          icon="add"
          label="Добавить книгу"
          @click="openFileDialog"
          flat
        />
        <q-btn
          color="white"
          icon="delete_sweep"
          label="Очистить полку"
          @click="clearShelf"
          flat
          class="q-mr-sm"
        />
        
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="q-pa-md">
        <div v-if="shelves.length" class="shelves-container">
          <div v-for="(shelf, index) in shelves" :key="index" class="shelf">
            <div class="shelf-top"></div>
            <div class="books-container">
              <q-card
                v-for="book in shelf.books"
                :key="book.id"
                class="book-card"
                @click="openBook(book)"
              >
                <q-img
                  :src="book.coverImage || 'default-book-cover.png'"
                  :ratio="3/4"
                  class="book-cover"
                >
                  <template v-slot:loading>
                    <q-skeleton type="rect" />
                  </template>
                  <template v-slot:error>
                    <div class="default-cover">
                      <q-icon name="book" size="48px" color="grey-6" />
                    </div>
                  </template>
                </q-img>
                <q-card-section class="book-info">
                  <div class="text-subtitle2 ellipsis-2-lines">{{ book.title }}</div>
                  <div class="text-caption text-grey ellipsis">{{ book.author }}</div>
                  <div class="text-caption text-grey">{{ formatDate(book.lastRead) }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <div v-else class="empty-library">
          <q-icon name="menu_book" size="64px" color="primary" />
          <div class="text-h6 q-mt-md">Ваша библиотека пуста</div>
          <div class="text-subtitle1 q-mb-lg">Добавьте свою первую книгу</div>
          <q-btn
            color="primary"
            icon="add"
            label="Добавить книгу"
            @click="openFileDialog"
          />
        </div>

        <q-dialog v-model="fileDialogOpen">
          <q-card class="upload-card">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">Добавить книгу</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section class="column items-center q-pa-lg">
              <q-icon name="cloud_upload" size="48px" color="primary" class="q-mb-md" />
              <div class="text-h6 q-mb-md">Выберите книгу для чтения</div>
              <q-file
                v-model="file"
                label="Выберите файл FB2"
                accept=".fb2,.zip"
                @update:model-value="loadBook"
                outlined
                bottom-slots
              >
                <template v-slot:prepend>
                  <q-icon name="book" />
                </template>
                <template v-slot:hint>
                  Поддерживаются файлы в формате FB2 и ZIP-архивы с FB2
                </template>
              </q-file>
            </q-card-section>
          </q-card>
        </q-dialog>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import JSZip from 'jszip'
import { useBooksStore } from '../stores/books'

export default defineComponent({
  name: 'BookShelf',

  setup() {
    const router = useRouter()
    const $q = useQuasar()
    const booksStore = useBooksStore()
    const fileDialogOpen = ref(false)
    const file = ref(null)
    const shelves = ref([])

    const loadHistory = () => {
      const history = booksStore.getReadingHistory()
      // Группируем книги по полкам (по 6 книг на полку)
      const groupedBooks = []
      for (let i = 0; i < history.length; i += 6) {
        groupedBooks.push({
          id: i,
          books: history.slice(i, i + 6)
        })
      }
      shelves.value = groupedBooks
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    const openFileDialog = () => {
      fileDialogOpen.value = true
    }

    const loadBook = async (file) => {
      if (!file) return

      try {
        const reader = new FileReader()
        
        reader.onload = async (e) => {
          try {
            let fb2Content = ''

            // Проверяем, является ли файл ZIP-архивом
            if (file.name.toLowerCase().endsWith('.zip')) {
              const zip = new JSZip()
              const zipContent = await zip.loadAsync(e.target.result)
              
              // Ищем первый FB2 файл в архиве
              let fb2File = null
              for (const filename of Object.keys(zipContent.files)) {
                if (filename.toLowerCase().endsWith('.fb2')) {
                  fb2File = zipContent.files[filename]
                  break
                }
              }

              if (!fb2File) {
                throw new Error('В архиве не найден FB2 файл')
              }

              // Читаем содержимое FB2 файла из архива
              fb2Content = await fb2File.async('text')
            } else {
              // Если это обычный FB2 файл
              fb2Content = e.target.result
            }

            // Сохраняем книгу в store
            const success = await booksStore.saveBook(file.name, fb2Content)
            
            if (success) {
              // Перенаправляем на страницу чтения
              router.push({
                name: 'reader',
                query: { file: file.name, newUpload: 'true' }
              })
              
              fileDialogOpen.value = false
            } else {
              throw new Error('Не удалось сохранить книгу')
            }
          } catch (error) {
            console.error('Ошибка при обработке файла:', error)
            $q.notify({
              message: `Ошибка при обработке файла: ${error.message}`,
              color: 'negative',
              position: 'top',
              timeout: 3000
            })
          }
        }

        reader.onerror = (error) => {
          console.error('Ошибка чтения файла:', error)
          $q.notify({
            message: 'Ошибка при чтении файла',
            color: 'negative',
            position: 'top',
            timeout: 2000
          })
        }

        // Читаем файл как ArrayBuffer для поддержки ZIP
        if (file.name.toLowerCase().endsWith('.zip')) {
          reader.readAsArrayBuffer(file)
        } else {
          reader.readAsText(file)
        }
      } catch (error) {
        console.error('Ошибка при загрузке файла:', error)
        $q.notify({
          message: 'Не удалось загрузить файл',
          color: 'negative',
          position: 'top',
          timeout: 2000
        })
      }
    }

    const openBook = (book) => {
      router.push({
        name: 'reader',
        query: { file: book.fileName }
      })
    }

    const clearShelf = async () => {
      try {
        booksStore.clearBooks()
        shelves.value = []
        
        $q.notify({
          message: 'Полка успешно очищена',
          color: 'positive',
          position: 'top',
          timeout: 2000
        })
      } catch (err) {
        console.error('Ошибка при очистке полки:', err)
        $q.notify({
          message: `Ошибка при очистке полки: ${err.message}`,
          color: 'negative',
          position: 'top',
          timeout: 2000
        })
      }
    }

    const confirmClearShelf = () => {
      $q.dialog({
        title: 'Подтверждение',
        message: 'Вы действительно хотите очистить полку?',
        persistent: true,
        ok: {
          label: 'Да',
          color: 'primary'
        },
        cancel: {
          label: 'Нет',
          color: 'negative'
        }
      }).onOk(() => {
        clearShelf()
      })
    }

    onMounted(() => {
      loadHistory()
    })

    return {
      fileDialogOpen,
      file,
      shelves,
      formatDate,
      openFileDialog,
      loadBook,
      openBook,
      clearShelf: confirmClearShelf
    }
  }
})
</script>

<style scoped>
.shelves-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.shelf {
  position: relative;
  background: #b7e78b73;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.shelf-top {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  height: 10px;
  background: #48a02da8;
  border-radius: 8px 8px 0 0;
}

.books-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.book-card {
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  max-width: 150px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.book-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.book-cover {
  border-radius: 4px 4px 0 0;
}

.default-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.book-info {
  padding: 8px;
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-card {
  width: 500px;
  max-width: 90vw;
}

.empty-library {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 200px);
  text-align: center;
  color: #666;
}

@media (max-width: 600px) {
  .books-container {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .book-card {
    max-width: 120px;
  }

  .book-info {
    padding: 4px;
  }

  .text-subtitle2 {
    font-size: 0.9em;
  }

  .text-caption {
    font-size: 0.8em;
  }
}
</style> 