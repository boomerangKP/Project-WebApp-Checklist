import { ref, onMounted } from 'vue'

export function useTheme() {
  const isDark = ref(false)

  // ฟังก์ชันสลับโหมด
  const toggleTheme = () => {
    isDark.value = !isDark.value
    updateHTMLClass()
  }

  // อัปเดต class ที่ tag <html> และบันทึกลงเครื่อง
  const updateHTMLClass = () => {
    const html = document.documentElement
    if (isDark.value) {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // โหลดค่าเดิมตอนเข้าเว็บครั้งแรก
  onMounted(() => {
    const savedTheme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
      isDark.value = true
    } else {
      isDark.value = false
    }
    updateHTMLClass()
  })

  return { isDark, toggleTheme }
}