import { defineStore } from 'pinia'
import LZString from 'lz-string'

export const useBooksStore = defineStore('books', {
  state: () => ({
    books: new Map(), // Хранит книги в памяти
    readingHistory: [] // История чтения
  }),

  actions: {
    // Сохранение книги
    async saveBook(fileName, content) {
      try {
        // Разбиваем содержимое на части и сжимаем каждую часть
        const chunkSize = 100000 // Размер чанка в символах
        const chunks = []
        
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize)
          const compressedChunk = LZString.compress(chunk)
          chunks.push(compressedChunk)
        }
        
        // Сохраняем сжатые чанки
        this.books.set(fileName, chunks)
        
        // Сохраняем в localStorage
        localStorage.setItem(`book_${fileName}`, JSON.stringify(chunks))
        
        // Обновляем историю чтения
        this.updateReadingHistory(fileName)
        
        return true
      } catch (error) {
        console.error('Ошибка при сохранении книги:', error)
        return false
      }
    },

    // Получение книги
    async getBook(fileName) {
      try {
        // Сначала пробуем получить из памяти
        let chunks = this.books.get(fileName)
        
        // Если нет в памяти, пробуем загрузить из localStorage
        if (!chunks) {
          const savedChunks = localStorage.getItem(`book_${fileName}`)
          if (savedChunks) {
            chunks = JSON.parse(savedChunks)
            // Сохраняем в памяти для быстрого доступа
            this.books.set(fileName, chunks)
          }
        }
        
        if (!chunks) return null
        
        let decompressedContent = ''
        for (const chunk of chunks) {
          decompressedContent += LZString.decompress(chunk)
        }
        
        return decompressedContent
      } catch (error) {
        console.error('Ошибка при получении книги:', error)
        return null
      }
    },

    // Обновление истории чтения
    updateReadingHistory(fileName) {
      const bookInfo = {
        id: Date.now().toString(),
        fileName: fileName,
        lastRead: new Date().toISOString(),
        coverImage: this.getBookCover(fileName) // Добавляем обложку
      }
      
      // Удаляем дубликаты
      const index = this.readingHistory.findIndex(b => b.fileName === fileName)
      if (index !== -1) {
        this.readingHistory.splice(index, 1)
      }
      
      // Добавляем в начало списка
      this.readingHistory.unshift(bookInfo)
      
      // Ограничиваем историю 20 книгами
      if (this.readingHistory.length > 20) {
        this.readingHistory.pop()
      }

      // Сохраняем историю в localStorage
      localStorage.setItem('readingHistory', JSON.stringify(this.readingHistory))
    },

    // Получение обложки книги
    getBookCover(fileName) {
      const chunks = this.books.get(fileName)
      if (!chunks) return null

      try {
        // Распаковываем содержимое книги
        let bookContent = ''
        for (const chunk of chunks) {
          bookContent += LZString.decompress(chunk)
        }

        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(bookContent, 'text/xml')
        
        // Ищем обложку
        const coverPage = xmlDoc.getElementsByTagName('coverpage')[0]
        if (coverPage) {
          const coverImageElement = coverPage.getElementsByTagName('image')[0]
          if (coverImageElement) {
            const href = coverImageElement.getAttribute('l:href') || 
                        coverImageElement.getAttribute('xlink:href')
            if (href) {
              const binary = xmlDoc.getElementById(href.substring(1))
              if (binary) {
                const contentType = binary.getAttribute('content-type')
                const base64Data = binary.textContent.replace(/\s/g, '')
                return `data:${contentType};base64,${base64Data}`
              }
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при получении обложки:', error)
      }
      
      return null
    },

    // Очистка всех книг
    clearBooks() {
      this.books.clear()
      this.readingHistory = []
      
      // Очищаем localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key.startsWith('book_')) {
          localStorage.removeItem(key)
        }
      }
      localStorage.removeItem('readingHistory')
    },

    // Получение истории чтения
    getReadingHistory() {
      // Загружаем историю из localStorage при первом обращении
      if (this.readingHistory.length === 0) {
        const savedHistory = localStorage.getItem('readingHistory')
        if (savedHistory) {
          this.readingHistory = JSON.parse(savedHistory)
        }
      }
      return this.readingHistory
    }
  }
}) 