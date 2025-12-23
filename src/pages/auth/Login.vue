<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase' 
// 👇 1. แก้ตรงนี้: เปลี่ยน import (เหมือนหน้า Home)
import { useUserStore } from '@/stores/user' 
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Loader2
} from 'lucide-vue-next'

const router = useRouter()
// 👇 2. ประกาศตัวแปร Store
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''

  try {
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (authError) throw authError

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email.value) 
      .single()

    if (empError || !employee) {
      await supabase.auth.signOut()
      throw new Error('ไม่พบข้อมูลพนักงานในระบบ')
    }

    if (employee.employees_status !== 'active') {
      await supabase.auth.signOut()
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน')
    }

    // 👇 3. เรียกใช้ผ่าน userStore (ถ้าเป็นโค้ดเก่า userStore.setSession จะพัง)
    userStore.setSession(session)
    userStore.setProfile(employee)

    if (employee.role === 'maid') {
      router.push({ name: 'maid-home' })
    } else {
      router.push('/admin')
    }

  } catch (err) {
    console.error(err)
    if (err.message.includes('Invalid login')) {
      errorMsg.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    } else {
      errorMsg.value = err.message
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-600">
    <div class="mb-8 text-center">
      <div class="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 rotate-3">
        <ShieldCheck class="w-8 h-8 text-white" />
      </div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">ระบบตรวจความสะอาด</h1>
      <p class="text-sm text-slate-500 mt-1">Facility Management System</p>
    </div>

    <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-8">
        <h2 class="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">เข้าสู่ระบบ</h2>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
            <span>{{ errorMsg }}</span>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">อีเมล</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail class="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input v-model="email" type="email" required class="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm" placeholder="user@example.com">
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">รหัสผ่าน</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock class="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input v-model="password" type="password" required class="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm" placeholder="••••••••">
            </div>
          </div>

          <button type="submit" :disabled="loading" class="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-2">
            <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
            <span v-else>เข้าใช้งาน</span>
            <ArrowRight v-if="!loading" class="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>