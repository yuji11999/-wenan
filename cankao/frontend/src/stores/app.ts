import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const currentPage = ref('dashboard')
  const isMobile = ref(false)

  const setCurrentPage = (page: string) => {
    currentPage.value = page
  }

  const checkMobile = () => {
    isMobile.value = window.innerWidth <= 768
  }

  return {
    currentPage,
    isMobile,
    setCurrentPage,
    checkMobile
  }
})





