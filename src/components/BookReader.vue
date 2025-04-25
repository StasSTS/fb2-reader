<template>
  <q-layout view="hHh lpR fFf">
    <!-- Toolbar -->
    <q-header elevated class="bg-primary text-white reader-header">
      <q-toolbar>
        <q-btn 
          v-if="bookContent"
          flat 
          round 
          dense 
          icon="menu" 
          @click="leftDrawerOpen = !leftDrawerOpen"
        >
          <q-tooltip>Оглавление</q-tooltip>
        </q-btn>
        <q-toolbar-title class="text-center">{{ bookContent?.title || 'Читалка FB2' }}</q-toolbar-title>
        <q-btn 
          v-if="bookContent"
          flat 
          round 
          dense 
          icon="bookmark_add" 
          @click="addBookmark" 
          class="q-mr-sm"
        >
          <q-tooltip>Добавить закладку</q-tooltip>
        </q-btn>
        <q-btn 
          v-if="bookContent"
          flat 
          round 
          dense 
          icon="bookmarks" 
          @click="rightDrawerOpen = !rightDrawerOpen" 
          class="q-mr-sm"
        >
          <q-tooltip>Закладки</q-tooltip>
        </q-btn>
        <q-btn 
          v-if="bookContent"
          flat 
          round 
          dense 
          icon="settings" 
          @click="settingsOpen = true"
        >
          <q-tooltip>Настройки</q-tooltip>
        </q-btn>
        <q-btn 
          v-if="bookContent"
          flat 
          round 
          dense 
          icon="home" 
          @click="$router.push('/')" 
          class="q-ml-sm"
        >
          <q-tooltip>На главную</q-tooltip>
        </q-btn>
      </q-toolbar>
      
      <!-- Reading Progress Bar -->
      <div v-if="bookContent" class="progress-container">
        <div 
          class="progress-bar" 
          :style="{ width: `${readingProgress}%` }"
        ></div>
      </div>
    </q-header>

    <!-- Left drawer with TOC -->
    <q-drawer
      v-model="leftDrawerOpen"
      side="left"
      bordered
      class="reader-drawer"
      :width="300"
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item-label header class="text-h6 q-px-md">Оглавление</q-item-label>
          <q-separator class="q-my-md" />
          <q-item
            v-for="(section, index) in sections"
            :key="index"
            clickable
            :active="currentSection === index"
            active-class="section-active"
            @click="navigateToSection(index)"
            class="section-item"
          >
            <q-item-section>
              <q-item-label lines="2">{{ section.title }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Right drawer with bookmarks -->
    <q-drawer
      v-model="rightDrawerOpen"
      side="right"
      bordered
      class="reader-drawer"
      :width="300"
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item-label header class="text-h6 q-px-md">
            Закладки
            <q-btn
              v-if="bookmarks.length"
              flat
              round
              dense
              icon="delete"
              size="sm"
              color="negative"
              class="float-right"
              @click="clearBookmarks"
            >
              <q-tooltip>Очистить все закладки</q-tooltip>
            </q-btn>
          </q-item-label>
          <q-separator class="q-my-md" />
          
          <template v-if="bookmarks.length">
            <q-item
              v-for="(bookmark, index) in bookmarks"
              :key="index"
              clickable
              @click="navigateToBookmark(bookmark)"
              class="bookmark-item"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">Закладка: </q-item-label>
                <q-item-label caption>{{ bookmark.preview }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  round
                  dense
                  icon="close"
                  size="sm"
                  color="grey-6"
                  @click.stop="removeBookmark(index)"
                >
                  <q-tooltip>Удалить закладку</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </template>
          
          <q-item v-else>
            <q-item-section class="text-grey text-center">
              Нет сохраненных закладок
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <q-page>
        <!-- Main Content -->
        <div 
          class="content q-pa-md" 
          ref="contentRef"
          :style="[contentStyle, { 
            '--content-background': settings.backgroundColor,
            '--page-background': settings.pageBackground
          }]"
        >
          <template v-if="bookContent">
            <div class="book-header q-mb-xl">
              <div class="text-h4 q-mb-md text-weight-light">{{ bookContent.title }}</div>
              <div class="text-subtitle1 q-mb-lg text-weight-medium text-primary">{{ bookContent.author }}</div>
              
              <q-card v-if="bookContent.annotation" flat bordered class="annotation-card q-mb-lg">
                <q-card-section>
                  <div class="text-subtitle2">{{ bookContent.annotation }}</div>
                </q-card-section>
              </q-card>

              <q-img
                v-if="bookContent.coverImage"
                :src="bookContent.coverImage"
                class="book-cover q-mb-xl"
                :ratio="3/4"
              >
                <template v-slot:loading>
                  <q-skeleton type="rect" />
                </template>
              </q-img>
            </div>

            <div 
              v-for="(section, index) in processedSections" 
              :key="index" 
              class="section"
              :ref="el => { if (el) sectionRefs[index] = el }"
            >
              <h2 class="section-title">{{ section.title }}</h2>
              <template v-for="(block, blockIndex) in section.blocks" :key="blockIndex">
                <p v-if="block.type === 'paragraph'" class="section-paragraph">
                  <template v-for="(item, itemIndex) in block.content" :key="itemIndex">
                    <q-img 
                      v-if="item.type === 'image'" 
                      :src="item.src" 
                      class="book-image" 
                      alt="Иллюстрация"
                      :ratio="16/9"
                    >
                      <template v-slot:loading>
                        <q-skeleton type="rect" />
                      </template>
                    </q-img>
                    <a 
                      v-else-if="item.type === 'footnote'" 
                      href="#"
                      class="footnote-link"
                      @click.prevent="showFootnote(item.href)"
                    >{{ item.text }}</a>
                    <span v-else>{{ item.text }}</span>
                  </template>
                </p>
                <q-img 
                  v-else-if="block.type === 'image'" 
                  :src="block.src" 
                  class="book-image" 
                  alt="Иллюстрация"
                  :ratio="16/9"
                >
                  <template v-slot:loading>
                    <q-skeleton type="rect" />
                  </template>
                </q-img>
                <h3 v-else-if="block.type === 'subtitle'" class="section-subtitle">{{ block.text }}</h3>
                <br v-else-if="block.type === 'empty-line'" />
              </template>
            </div>
          </template>

          <div v-else class="upload-area">
            <q-card flat bordered class="upload-card">
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
          </div>
        </div>
      </q-page>
    </q-page-container>

    <!-- Settings Dialog -->
    <q-dialog v-model="settingsOpen">
      <q-card class="settings-card" @click.stop>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Настройки чтения</div>
          <q-space />
          <q-btn 
            flat 
            round 
            dense 
            icon="restart_alt" 
            class="q-mr-sm"
            @click="resetSettings"
          >
            <q-tooltip>Сбросить настройки</q-tooltip>
          </q-btn>
          <q-btn icon="close" flat round dense v-close-popup>
            <q-tooltip>Закрыть</q-tooltip>
          </q-btn>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="settings-grid">
            <!-- Font Size -->
            <div class="setting-item">
              <div class="setting-label">
                <q-icon name="format_size" />
                <span>Размер шрифта</span>
              </div>
              <div class="setting-control">
                <q-btn-group spread>
                  <q-btn
                    v-for="size in ['14px', '16px', '18px', '20px', '24px']"
                    :key="size"
                    :label="size.replace('px', '')"
                    :color="settings.fontSize === size ? 'primary' : 'grey-4'"
                    :text-color="settings.fontSize === size ? 'white' : 'black'"
                    @click="settings.fontSize = size"
                    size="sm"
                  />
                </q-btn-group>
              </div>
            </div>

            <!-- Line Height -->
            <div class="setting-item">
              <div class="setting-label">
                <q-icon name="format_line_spacing" />
                <span>Межстрочный интервал</span>
              </div>
              <div class="setting-control">
                <q-slider
                  v-model="settings.lineHeight"
                  :min="1.2"
                  :max="2"
                  :step="0.1"
                  label
                  label-always
                  color="primary"
                  @update:model-value="updateSettings"
                />
              </div>
            </div>

            <!-- Text Width -->
            <div class="setting-item">
              <div class="setting-label">
                <q-icon name="format_align_justify" />
                <span>Ширина текста</span>
              </div>
              <div class="setting-control">
                <q-slider
                  v-model="settings.maxWidth"
                  :min="600"
                  :max="1200"
                  :step="50"
                  label
                  label-always
                  color="primary"
                  @update:model-value="updateSettings"
                />
              </div>
            </div>

            <!-- Font Family -->
            <div class="setting-item">
              <div class="setting-label">
                <q-icon name="font_download" />
                <span>Шрифт</span>
              </div>
              <div class="setting-control">
                <q-btn-group spread>
                  <q-btn
                    v-for="font in ['Arial', 'Georgia', 'Roboto', 'Times New Roman']"
                    :key="font"
                    :label="font"
                    :color="settings.fontFamily === font ? 'primary' : 'grey-3'"
                    :text-color="settings.fontFamily === font ? 'white' : 'black'"
                    @click="updateSetting('fontFamily', font)"
                    no-caps
                    unelevated
                  />
                </q-btn-group>
              </div>
            </div>

            <!-- Theme -->
            <div class="setting-item">
              <div class="setting-label">
                <q-icon name="palette" />
                <span>Цветовая схема</span>
              </div>
              <div class="setting-control themes">
                <div
                  v-for="theme in colorThemes"
                  :key="theme.name"
                  class="theme-option"
                  :class="{ active: isCurrentTheme(theme) }"
                  @click="applyTheme(theme)"
                  :style="{
                    backgroundColor: theme.backgroundColor,
                    color: theme.textColor
                  }"
                >
                  <span class="theme-label">{{ theme.name }}</span>
                </div>
              </div>
            </div>

            <!-- Page Background -->
            <div class="setting-item">
              <div class="setting-label">
                <q-icon name="wallpaper" />
                <span>Цвет фона</span>
              </div>
              <div class="setting-control themes">
                <div
                  v-for="theme in pageBackgroundThemes"
                  :key="theme.name"
                  class="theme-option page-background-option"
                  :class="{ active: settings.pageBackground === theme.color }"
                  @click="updateSetting('pageBackground', theme.color)"
                  :style="{
                    backgroundColor: theme.color
                  }"
                >
                  <span class="theme-label">{{ theme.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Footnote Dialog -->
    <q-dialog
      v-model="footnoteDialogOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <div class="footnote-wrapper" @click.self="footnoteDialogOpen = false">
        <q-card class="footnote-card" :style="footnoteCardStyle">
          <div class="close-button-wrapper">
            <q-btn icon="close" flat round dense class="close-button" v-close-popup />
          </div>
          <q-card-section class="footnote-content">
            <div class="footnote-inner">
              <template v-if="Array.isArray(currentFootnote)">
                <template v-for="(block, blockIndex) in currentFootnote" :key="blockIndex">
                  <p v-if="block.type === 'paragraph'" class="section-paragraph">
                    <template v-for="(item, itemIndex) in block.content" :key="itemIndex">
                      <q-img 
                        v-if="item.type === 'image'" 
                        :src="item.src" 
                        class="book-image" 
                        alt="Иллюстрация"
                        :ratio="16/9"
                      >
                        <template v-slot:loading>
                          <q-skeleton type="rect" />
                        </template>
                      </q-img>
                      <a 
                        v-else-if="item.type === 'footnote'" 
                        href="#"
                        class="footnote-link"
                        @click.prevent="showFootnote(item.href)"
                      >{{ item.text }}</a>
                      <span v-else>{{ item.text }}</span>
                    </template>
                  </p>
                  <q-img 
                    v-else-if="block.type === 'image'" 
                    :src="block.src" 
                    class="book-image" 
                    alt="Иллюстрация"
                    :ratio="16/9"
                  >
                    <template v-slot:loading>
                      <q-skeleton type="rect" />
                    </template>
                  </q-img>
                  <h3 v-else-if="block.type === 'subtitle'" class="section-subtitle">{{ block.text }}</h3>
                  <br v-else-if="block.type === 'empty-line'" />
                </template>
              </template>
              <div v-else class="section-paragraph">{{ currentFootnote }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </q-dialog>
  </q-layout>
</template>

<script>
import { defineComponent, ref, onBeforeUpdate, nextTick, computed, onMounted } from 'vue'
import { DOMParser } from '@xmldom/xmldom'
import { useQuasar } from 'quasar'
import JSZip from 'jszip'
// import LZString from 'lz-string'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '../stores/books'

export default defineComponent({
  name: 'BookReader',

  setup() {
    const $q = useQuasar()
    const router = useRouter()
    const route = useRoute()
    const booksStore = useBooksStore()
    const leftDrawerOpen = ref(false)
    const settingsOpen = ref(false)
    const footnoteDialogOpen = ref(false)
    const currentFootnote = ref('')
    const file = ref(null)
    const bookContent = ref(null)
    const sections = ref([])
    const currentSection = ref(0)
    const contentRef = ref(null)
    const sectionRefs = ref({})
    const images = ref({})
    const footnotes = ref({})
    const processedSections = ref([])
    const rightDrawerOpen = ref(false)
    const bookmarks = ref([])

    const defaultSettings = {
      fontSize: '16px',
      fontFamily: 'Arial',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      maxWidth: 800,
      lineHeight: 1.6,
      pageBackground: '#f5f5f5'
    }

    const settings = ref({ ...defaultSettings })

    const fontSizeOptions = [
      '12px', '14px', '16px', '18px', '20px', '24px'
    ]

    const fontFamilyOptions = [
      'Arial', 'Times New Roman', 'Georgia', 'Verdana'
    ]

    // Вычисляемые стили для контента
    const contentStyle = computed(() => ({
      fontSize: settings.value.fontSize,
      fontFamily: settings.value.fontFamily,
      color: settings.value.textColor,
      '--content-max-width': `${settings.value.maxWidth}px`,
      '--content-line-height': settings.value.lineHeight
    }))

    // Функция сброса настроек
    const resetSettings = () => {
      settings.value = { ...defaultSettings }
      updateSettings()
      $q.notify({
        message: 'Настройки сброшены',
        color: 'positive',
        icon: 'check',
        position: 'top',
        timeout: 2000
      })
    }

    // Функция обновления настроек
    const updateSettings = () => {
      // Сохраняем настройки в localStorage
      localStorage.setItem('readerSettings', JSON.stringify(settings.value))
    }

    // Загружаем сохраненные настройки при инициализации
    const loadSavedSettings = () => {
      const savedSettings = localStorage.getItem('readerSettings')
      if (savedSettings) {
        settings.value = { ...settings.value, ...JSON.parse(savedSettings) }
      }
      
      // Load saved bookmarks for current book
      loadBookmarks()
    }

    const loadBookmarks = () => {
      const fileName = route.query.file
      if (!fileName) return
      
      const savedBookmarks = localStorage.getItem(`bookmarks_${fileName}`)
      if (savedBookmarks) {
        bookmarks.value = JSON.parse(savedBookmarks)
      } else {
        bookmarks.value = []
      }
    }

    // Вызываем загрузку настроек при создании компонента
    loadSavedSettings()

    onBeforeUpdate(() => {
      sectionRefs.value = {}
    })

    const getTextContent = (xmlDoc, tagName) => {
      try {
        const elements = xmlDoc.getElementsByTagName(tagName)
        if (elements && elements.length > 0) {
          return elements[0].textContent || ''
        }
        return ''
      } catch (error) {
        console.error('Error getting text content:', error)
        return ''
      }
    }

    const loadImages = (xmlDoc) => {
      const binaryElements = xmlDoc.getElementsByTagName('binary')
      for (let i = 0; i < binaryElements.length; i++) {
        const binary = binaryElements[i]
        const id = binary.getAttribute('id')
        const contentType = binary.getAttribute('content-type')
        if (id && contentType.startsWith('image/')) {
          // Декодируем base64 в URL изображения
          const base64Data = binary.textContent.replace(/\s/g, '')
          images.value[`#${id}`] = `data:${contentType};base64,${base64Data}`
        }
      }
    }

    const parseSection = (section) => {
      const title = section.getElementsByTagName('title')[0]
      const titleText = title ? title.textContent : 'Без названия'
      const blocks = []
      
      const processNode = (node) => {
        if (node.nodeType === 3) { // Text node
          return [{
            type: 'text',
            text: node.textContent
          }]
        }
        
        if (node.nodeType === 1) { // Element node
          if (node.nodeName === 'image') {
            const href = node.getAttribute('l:href') || node.getAttribute('xlink:href')
            if (href && images.value[href]) {
              return [{
                type: 'image',
                src: images.value[href]
              }]
            }
          } else if (node.nodeName === 'a') {
            const href = node.getAttribute('l:href') || node.getAttribute('xlink:href') || node.getAttribute('href')
            const type = node.getAttribute('type')
            if (href && (type === 'note' || href.startsWith('#note'))) {
              return [{
                type: 'footnote',
                href: href.startsWith('#') ? href : `#${href}`,
                text: node.textContent
              }]
            }
          }
          
          // Для других элементов собираем содержимое из дочерних узлов
          const content = []
          for (let i = 0; i < node.childNodes.length; i++) {
            content.push(...processNode(node.childNodes[i]))
          }
          return content
        }
        
        return []
      }
      
      // Обрабатываем каждый узел секции
      for (let i = 0; i < section.childNodes.length; i++) {
        const node = section.childNodes[i]
        
        if (node.nodeName === 'title') continue

        if (node.nodeName === 'p') {
          const content = processNode(node)
          if (content.length > 0) {
            blocks.push({
              type: 'paragraph',
              content
            })
          }
        } else if (node.nodeName === 'image') {
          const href = node.getAttribute('l:href') || node.getAttribute('xlink:href')
          if (href && images.value[href]) {
            blocks.push({
              type: 'image',
              src: images.value[href]
            })
          }
        } else if (node.nodeName === '#text' && node.textContent.trim()) {
          blocks.push({
            type: 'paragraph',
            content: [{
              type: 'text',
              text: node.textContent.trim()
            }]
          })
        } else if (node.nodeName === 'subtitle') {
          blocks.push({
            type: 'subtitle',
            text: node.textContent
          })
        } else if (node.nodeName === 'empty-line') {
          blocks.push({
            type: 'empty-line'
          })
        }
      }

      return {
        title: titleText,
        blocks
      }
    }

    const loadBook = async (file) => {
      if (!file) return

      const reader = new FileReader()
      reader.onerror = (error) => {
        console.error('Ошибка чтения файла:', error)
        $q.notify({
          message: 'Не удалось прочитать файл',
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }

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

          // Сохраняем содержимое книги в localStorage
          localStorage.setItem(`book_${file.name}`, fb2Content)

          await processBookContent(fb2Content)
        } catch (error) {
          console.error('Ошибка обработки книги:', error)
          $q.notify({
            message: 'Не удалось обработать файл книги: ' + error.message,
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 3000
          })
        }
      }

      try {
        // Читаем файл как ArrayBuffer для поддержки ZIP
        if (file.name.toLowerCase().endsWith('.zip')) {
          reader.readAsArrayBuffer(file)
        } else {
          reader.readAsText(file)
        }
      } catch (error) {
        console.error('Ошибка начала чтения файла:', error)
        $q.notify({
          message: 'Не удалось начать чтение файла',
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    }

    // Функция для обработки содержимого книги
    const processBookContent = async (fb2Content) => {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(fb2Content, 'text/xml')
      
      // Проверяем валидность XML
      const parserError = xmlDoc.getElementsByTagName('parsererror')
      if (parserError.length > 0) {
        throw new Error('Неверный формат XML')
      }
      
      // Загружаем изображения
      loadImages(xmlDoc)

      // Получаем все body элементы
      const bodies = xmlDoc.getElementsByTagName('body')
      if (!bodies || bodies.length === 0) {
        throw new Error('Не найдено содержимое книги')
      }

      // Обрабатываем сноски и основной контент
      let mainBody = null
      footnotes.value = {}

      Array.from(bodies).forEach(body => {
        const type = body.getAttribute('name')
        
        if (type === 'notes') {
          // Обрабатываем сноски
          const sections = body.getElementsByTagName('section')
          Array.from(sections).forEach(section => {
            const id = section.getAttribute('id')
            if (id) {
              const noteContent = parseSection(section)
              const noteId = id.startsWith('#') ? id : `#${id}`
              footnotes.value[noteId] = noteContent.blocks
            }
          })
        } else if (!type) {
          // Сохраняем основное тело книги
          mainBody = body
        }
      })

      // Если основное тело не найдено, берем первый body
      mainBody = mainBody || bodies[0]

      // Ищем информацию о книге
      const titleInfo = xmlDoc.getElementsByTagName('title-info')[0]
      const firstName = titleInfo ? getTextContent(titleInfo, 'first-name') : ''
      const lastName = titleInfo ? getTextContent(titleInfo, 'last-name') : ''
      const bookTitle = titleInfo ? getTextContent(titleInfo, 'book-title') : 'Без названия'
      const annotation = titleInfo ? getTextContent(titleInfo, 'annotation') : ''

      // Ищем обложку
      let coverImage = null
      const coverPage = xmlDoc.getElementsByTagName('coverpage')[0]
      if (coverPage) {
        const coverImageElement = coverPage.getElementsByTagName('image')[0]
        if (coverImageElement) {
          const href = coverImageElement.getAttribute('l:href') || 
                      coverImageElement.getAttribute('xlink:href')
          if (href) {
            coverImage = images.value[href]
          }
        }
      }

      // Сохраняем информацию о книге
      bookContent.value = {
        title: bookTitle || 'Без названия',
        author: `${firstName} ${lastName}`.trim() || 'Неизвестный автор',
        annotation: annotation,
        coverImage: coverImage
      }

      // Обновляем историю чтения
      updateReadingHistory(bookTitle, `${firstName} ${lastName}`.trim(), coverImage)

      // Парсим секции из основного тела книги
      const sectionElements = mainBody.getElementsByTagName('section')
      if (!sectionElements || sectionElements.length === 0) {
        throw new Error('В книге не найдены разделы')
      }

      // Обрабатываем секции
      processedSections.value = Array.from(sectionElements).map(parseSection)
      sections.value = processedSections.value
    }

    // Функция обновления истории чтения
    const updateReadingHistory = (title, author, coverImage) => {
      const readingHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]')

      const bookInfo = {
        id: Date.now().toString(),
        title: title || 'Без названия',
        author: author || 'Неизвестный автор',
        coverImage: coverImage,
        fileName: route.query.file,
        lastRead: new Date().toISOString()
      }
      
      // Удаляем дубликаты
      const index = readingHistory.findIndex(b => b.fileName === route.query.file)
      if (index !== -1) {
        readingHistory.splice(index, 1)
      }
      
      // Добавляем в начало списка
      readingHistory.unshift(bookInfo)
      
      // Ограничиваем историю 20 книгами
      if (readingHistory.length > 20) {
        readingHistory.pop()
      }
      
      localStorage.setItem('readingHistory', JSON.stringify(readingHistory))
    }

    // Функция для загрузки книги из store
    const loadBookFromStorage = async () => {
      const fileName = route.query.file
      if (!fileName) return

      const isNewUpload = route.query.newUpload === 'true'

      try {
        const bookContent = await booksStore.getBook(fileName)
        
        if (!bookContent && !isNewUpload) {
          $q.notify({
            message: 'Не удалось загрузить книгу из хранилища. Пожалуйста, выберите файл заново.',
            color: 'warning',
            position: 'top',
            timeout: 3000
          })
          router.push('/')
          return
        }

        if (bookContent) {
          await processBookContent(bookContent)
          // Обновляем историю чтения после загрузки книги
          if (bookContent.value) {
            booksStore.updateReadingHistory(fileName)
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке книги:', error)
        $q.notify({
          message: 'Ошибка при загрузке книги',
          color: 'negative',
          position: 'top',
          timeout: 3000
        })
      }
    }

    // Обработка route query при монтировании компонента
    onMounted(async () => {
      if (route.query.file) {
        loadBookFromStorage()
        loadBookmarks() // Загружаем закладки для текущей книги
      }
    })

    const navigateToSection = (index) => {
      currentSection.value = index
      leftDrawerOpen.value = false

      nextTick(() => {
        if (sectionRefs.value[index] && contentRef.value) {
          const sectionElement = sectionRefs.value[index]
          const headerHeight = 50
          const extraOffset = 20
          
          contentRef.value.scrollTop = sectionElement.offsetTop - headerHeight - extraOffset
        }
      })
    }

    const getCurrentChapterInfo = () => {
      if (!contentRef.value || !sections.value.length) return null;

      const scrollTop = contentRef.value.scrollTop;
      const headerHeight = 50;

      // Создаем массив с информацией о позициях глав
      const chapterPositions = Object.entries(sectionRefs.value).map(([index, section]) => ({
        index: parseInt(index),
        title: sections.value[parseInt(index)].title,
        top: section.offsetTop
      }));

      // Сортируем по позиции на странице
      chapterPositions.sort((a, b) => a.top - b.top);

      // Находим текущую главу
      let currentChapter = chapterPositions[0];
      for (const chapter of chapterPositions) {
        if (chapter.top <= scrollTop + headerHeight) {
          currentChapter = chapter;
        } else {
          break;
        }
      }

      // Находим реальный индекс главы в оглавлении
      const tocIndex = sections.value.findIndex(section => section.title === currentChapter.title);
      
      return {
        index: tocIndex,
        title: currentChapter.title,
        displayIndex: tocIndex + 1
      };
    }

    const addBookmark = () => {
      if (!bookContent.value) return;

      const currentPosition = contentRef.value.scrollTop;
      const chapterInfo = getCurrentChapterInfo();

      if (!chapterInfo) {
        $q.notify({
          message: 'Не удалось определить текущую позицию для закладки',
          color: 'warning',
          icon: 'warning',
          position: 'top',
          timeout: 2000
        });
        return;
      }

      const currentSection = sectionRefs.value[chapterInfo.index];
      if (!currentSection) {
        $q.notify({
          message: 'Не удалось определить текущую главу',
          color: 'warning',
          icon: 'warning',
          position: 'top',
          timeout: 2000
        });
        return;
      }

      const textContent = currentSection.textContent || '';
      const preview = textContent.substring(0, 100).trim() + '...';

      const bookmark = {
        title: chapterInfo.title,
        preview: preview,
        sectionIndex: chapterInfo.index,
        displayIndex: chapterInfo.displayIndex,
        scrollPosition: currentPosition,
        timestamp: new Date().toISOString()
      };

      bookmarks.value.unshift(bookmark);
      saveBookmarks();

      $q.notify({
        message: 'Закладка добавлена',
        color: 'positive',
        icon: 'bookmark',
        position: 'top',
        timeout: 2000
      });
    };

    const showFootnote = (id) => {
      if (footnotes.value[id]) {
        currentFootnote.value = footnotes.value[id]
        footnoteDialogOpen.value = true
      }
    }

    // Add reading progress computation:
    const readingProgress = computed(() => {
      if (!contentRef.value) return 0
      const scrollTop = contentRef.value.scrollTop
      const scrollHeight = contentRef.value.scrollHeight - contentRef.value.clientHeight
      return Math.round((scrollTop / scrollHeight) * 100) || 0
    })

    const footnoteCardStyle = computed(() => {
      if (!currentFootnote.value) return {}
      
      return {
        'min-height': 'fit-content',
        'height': 'auto'
      }
    })

    const colorThemes = [
      { name: 'Светлая', backgroundColor: '#ffffff', textColor: '#000000' },
      { name: 'Сепия', backgroundColor: '#f4ecd8', textColor: '#5c4b37' },
      { name: 'Тёмная', backgroundColor: '#282c35', textColor: '#e4e4e4' },
      { name: 'Чёрная', backgroundColor: '#000000', textColor: '#c4c4c4' }
    ]

    const pageBackgroundThemes = [
      { name: 'Светло-серый', color: '#f5f5f5' },
      { name: 'Белый', color: '#ffffff' },
      { name: 'Кремовый', color: '#fff8e7' },
      { name: 'Мятный', color: '#f0f7f4' },
      { name: 'Лавандовый', color: '#f3f1f5' },
      { name: 'Тёмно-серый', color: '#1a1a1a' }
    ]

    const updateSetting = (key, value) => {
      settings.value[key] = value
      updateSettings()
    }

    const isCurrentTheme = (theme) => {
      return settings.value.backgroundColor === theme.backgroundColor &&
             settings.value.textColor === theme.textColor
    }

    const applyTheme = (theme) => {
      settings.value.backgroundColor = theme.backgroundColor
      settings.value.textColor = theme.textColor
      
      // Автоматически меняем цвет фона страницы в зависимости от темы
      if (theme.backgroundColor === '#282c35' || theme.backgroundColor === '#000000') {
        settings.value.pageBackground = '#1a1a1a' // Тёмный фон для тёмных тем
      } else {
        settings.value.pageBackground = '#f5f5f5' // Светлый фон для светлых тем
      }
      
      updateSettings()
    }

    const saveBookmarks = () => {
      const fileName = route.query.file
      if (!fileName) return

      try {
        localStorage.setItem(`bookmarks_${fileName}`, JSON.stringify(bookmarks.value))
      } catch (error) {
        console.error('Ошибка сохранения закладок:', error)
        $q.notify({
          message: 'Не удалось сохранить закладку',
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    }

    const clearBookmarks = () => {
      const fileName = route.query.file
      if (!fileName) return

      bookmarks.value = []
      localStorage.removeItem(`bookmarks_${fileName}`)
      
      // Show notification
      $q.notify({
        message: 'Все закладки удалены',
        color: 'negative',
        icon: 'delete',
        position: 'top',
        timeout: 2000
      })
    }

    const removeBookmark = (index) => {
      bookmarks.value.splice(index, 1)
      saveBookmarks()
      
      // Show notification
      $q.notify({
        message: 'Закладка удалена',
        color: 'negative',
        icon: 'bookmark_remove',
        position: 'top',
        timeout: 2000
      })
    }

    const navigateToBookmark = (bookmark) => {
      currentSection.value = bookmark.sectionIndex;
      rightDrawerOpen.value = false;

      nextTick(() => {
        if (contentRef.value) {
          contentRef.value.scrollTop = bookmark.scrollPosition;
        }
      });
    }

    return {
      leftDrawerOpen,
      settingsOpen,
      footnoteDialogOpen,
      currentFootnote,
      file,
      bookContent,
      sections,
      currentSection,
      settings,
      fontSizeOptions,
      fontFamilyOptions,
      loadBook,
      navigateToSection,
      contentRef,
      sectionRefs,
      contentStyle,
      updateSettings,
      images,
      showFootnote,
      processedSections,
      readingProgress,
      footnoteCardStyle,
      colorThemes,
      pageBackgroundThemes,
      updateSetting,
      isCurrentTheme,
      applyTheme,
      rightDrawerOpen,
      bookmarks,
      addBookmark,
      clearBookmarks,
      removeBookmark,
      navigateToBookmark,
      router,
      resetSettings
    }
  }
})
</script>

<style>
.book-reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.reader-header {
  backdrop-filter: blur(10px);
  background: rgba(25, 118, 210, 0.95) !important;
}

.progress-container {
  height: 2px;
  background-color: rgba(255, 255, 255, 0.2);
}

.progress-bar {
  height: 100%;
  background-color: #fff;
  transition: width 0.3s ease;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-top: 70px;
  position: relative;
  scroll-behavior: smooth;
  background-color: v-bind('settings.pageBackground');
  transition: background-color 0.3s ease;
  height: calc(100vh - 52px); /* 52px это высота header */
}

.content > *:not(.upload-area) {
  max-width: var(--content-max-width, 800px);
  margin-left: auto;
  margin-right: auto;
  background-color: var(--page-background);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.reader-drawer {
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.reader-drawer .q-list {
  background-color: var(--content-background);
}

.reader-drawer .q-item {
  transition: all 0.3s ease;
}

.reader-drawer .q-item:hover {
  background-color: rgba(25, 118, 210, 0.05);
}

.section-item {
  border-radius: 8px;
  margin: 4px 8px;
}

.section-active {
  background-color: rgba(25, 118, 210, 0.1) !important;
  color: #1976D2;
  font-weight: 500;
}

.book-header {
  text-align: center;
}

.book-cover {
  max-width: 300px;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.book-cover:hover {
  transform: scale(1.02);
}

.annotation-card {
  background-color: rgba(25, 118, 210, 0.05);
  border-radius: 8px;
}

.section {
  margin-bottom: 2rem;
  position: relative;
}

.section-title {
  font-size: 1.5em;
  font-weight: 500;
  color: #1976D2;
  margin: 1.5em 0 1em;
}

.section-subtitle {
  font-size: 1.2em;
  font-weight: 500;
  color: #1976D2;
  margin: 1em 0;
}

.section-paragraph {
  margin: 1em 0;
  line-height: var(--content-line-height, 1.6);
  text-align: justify;
}

.book-image {
  max-width: 100%;
  margin: 1.5em auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.book-image:hover {
  transform: scale(1.01);
}

.footnote-link {
  color: #1976D2;
  text-decoration: none;
  cursor: pointer;
  vertical-align: super;
  font-size: 0.8em;
  padding: 0 2px;
  transition: all 0.3s ease;
}

.footnote-link:hover {
  text-decoration: underline;
  background-color: rgba(25, 118, 210, 0.1);
}

.upload-area {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.upload-card {
  max-width: 400px;
  width: 100%;
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.upload-card:hover {
  transform: translateY(-2px);
}

.footnote-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.footnote-card {
  position: relative;
  width: min(90vw, 870px);
  min-width: 507px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.close-button-wrapper {
  position: absolute;
  right: -48px;
  top: 0;
  z-index: 1;
}

.close-button {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.footnote-content {
  padding: 0 !important;
  width: 100%;
  height: 100%;
}

.footnote-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

.q-dialog .book-image {
  max-width: 100%;
  margin: 1em auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.q-dialog .section-paragraph {
  margin: 0.5em 0;
  line-height: 1.5;
  font-size: 1.1em;
  white-space: pre-wrap;
}

@media (max-width: 600px) {
  .content {
    padding: 16px;
    padding-top: 60px;
  }

  .book-header {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.3em;
  }

  .section-subtitle {
    font-size: 1.1em;
  }

  .footnote-card {
    width: 90vw;
    min-width: unset;
    margin: 16px;
  }

  .close-button-wrapper {
    right: 0;
    top: -48px;
  }
}

.settings-card {
  width: 600px;
  max-width: 90vw;
}

.settings-grid {
  display: grid;
  gap: 24px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.setting-label .q-icon {
  font-size: 1.2em;
  color: #1976D2;
}

.setting-control {
  width: 100%;
}

.themes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.theme-option {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.theme-option:hover {
  transform: translateY(-2px);
}

.theme-option.active {
  border-color: #1976D2;
}

.theme-label {
  font-size: 0.9em;
  font-weight: 500;
}

/* Скрываем полосу прокрутки для Webkit (Chrome, Safari, новые версии Edge) */
.content::-webkit-scrollbar {
  display: none;
}

/* Скрываем полосу прокрутки для Firefox */
.content {
  scrollbar-width: none;
}

/* Скрываем полосу прокрутки для IE и Edge */
.content {
  -ms-overflow-style: none;
}

/* Скрываем полосу прокрутки в drawer */
.reader-drawer .q-scroll-area > div::-webkit-scrollbar {
  display: none !important;
}

.reader-drawer .q-scroll-area > div {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

/* Скрываем полосу прокрутки Quasar */
.reader-drawer .q-scrollarea__bar {
  display: none !important;
}

/* Глобальное скрытие полос прокрутки */
::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
}

* {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.q-scrollarea__bar,
.q-scrollarea__thumb {
  display: none !important;
  width: 0 !important;
  opacity: 0 !important;
}

.bookmark-item {
  border-radius: 8px;
  margin: 4px 8px;
  transition: all 0.3s ease;
}

.bookmark-item:hover {
  background-color: rgba(25, 118, 210, 0.05);
}

.bookmark-item .q-item__label--caption {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #666;
}

.bookmark-item .q-btn {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.bookmark-item:hover .q-btn {
  opacity: 1;
}
</style> 