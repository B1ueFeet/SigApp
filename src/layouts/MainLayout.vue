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
      <q-list padding>
        <q-item clickable v-ripple @click="confirmReset = true">
          <q-item-section avatar><q-icon name="delete_forever" /></q-item-section>
          <q-item-section>Eliminar Base</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="confirmReset" persistent transition-show="scale" transition-hide="scale">
      <q-card style="min-width: 300px">
        <q-card-section class="text-h6">
          ¿Seguro que desea eliminar la base de datos?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="CANCELAR" @click="confirmReset = false" />
          <q-btn flat label="ELIMINAR" color="negative" @click="resetDatabase" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script>
import { ref } from 'vue'
import dbService from 'src/services/db'
import localforage from 'localforage'

export default {
  name: 'MainLayout',
  setup() {
    const leftDrawerOpen = ref(false)
    const confirmReset = ref(false)

    const toggleLeftDrawer = () => {
      leftDrawerOpen.value = !leftDrawerOpen.value
    }

    const exportDatabase = () => {
      const data = dbService.db.export()
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
      }
      reader.readAsArrayBuffer(file)
    }

    const resetDatabase = async () => {
      try {
        await localforage.removeItem('sigapp-db')
        dbService.db = new dbService.SQL.Database()
        dbService.createTables()
        await dbService.save()
        window.location.reload()
      }
      catch (err) {
        console.error('Error al eliminar la base:', err)
      }
    }

    return {
      leftDrawerOpen,
      confirmReset,
      toggleLeftDrawer,
      exportDatabase,
      onFileChange,
      resetDatabase
    }
  }
}
</script>

