<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>SigApp</q-toolbar-title>

        <q-btn flat dense icon="download" label="Exportar BD" @click="exportDatabase" />
        <q-btn flat dense icon="upload" label="Importar BD" @click="$refs.fileInput.click()" />

        <input ref="fileInput" type="file" accept=".sqlite" style="display:none" @change="onFileChange" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <!-- menú lateral -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref } from 'vue'
import dbService from 'src/services/db'

export default {
  name: 'MainLayout',
  setup() {
    const leftDrawerOpen = ref(false)
    const toggleLeftDrawer = () => { leftDrawerOpen.value = !leftDrawerOpen.value }

    const exportDatabase = () => {
      const data = dbService.exportData()
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sigapp-database.sqlite'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const onFileChange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        dbService.importDatabase(reader.result)
        // disparamos evento para que las páginas recarguen sus datos
        window.dispatchEvent(new Event('db-imported'))
      }
      reader.readAsArrayBuffer(file)
    }

    return {
      leftDrawerOpen, toggleLeftDrawer,
      exportDatabase, onFileChange
    }
  }
}
</script>
