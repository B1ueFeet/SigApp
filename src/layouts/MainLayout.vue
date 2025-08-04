<template>
  <q-layout view="lHh Lpr lFf">
    <!-- HEADER -->
    <q-header elevated>
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="toggleDrawer" />
        <q-toolbar-title>SigApp</q-toolbar-title>

        <q-btn flat dense icon="download" label="Exportar BD" @click="exportDatabase" />
        <q-btn flat dense icon="upload" label="Importar BD" @click="$refs.fileInput.click()" />
        <input ref="fileInput" type="file" accept=".sqlite" style="display: none" @change="onFileChange" />
      </q-toolbar>
    </q-header>

    <!-- DRAWER -->
    <q-drawer v-model="drawer" show-if-above bordered width-hint="250" class="flex flex-col">
      <!-- Scrollable area para los links -->
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item-label header>Menú</q-item-label>
          <q-separator />
          <q-item v-for="link in essentialLinks" :key="link.label" clickable :to="link.to" v-ripple>
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>{{ link.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>

      <!-- Botón fijo al pie -->
      <div class="q-pa-md">
        <q-btn color="negative" icon="delete_forever" label="Eliminar Base" @click="confirmReset = true" unelevated
          class="full-width" />
      </div>
    </q-drawer>

    <!-- CONTENIDO PRINCIPAL -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- DIALOGO DE CONFIRMACIÓN -->
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
import { useQuasar } from 'quasar'
import dbService from 'src/services/db'
import localforage from 'localforage'

export default {
  name: 'MainLayout',
  setup() {
    const $q = useQuasar()
    const drawer = ref(true)
    const confirmReset = ref(false)

    const essentialLinks = [
      { icon: 'home', label: 'Cotizaciones', to: '/' },
      { icon: 'list', label: 'Historial', to: '/historial' },
      { icon: 'bank', label: 'Garantias', to: '/garantia' },
      { icon: 'settings', label: 'Configuración', to: '/settings' }
    ]

    const toggleDrawer = () => {
      drawer.value = !drawer.value
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
        $q.notify({ type: 'positive', message: 'Base importada correctamente' })
      }
      reader.readAsArrayBuffer(file)
    }

    const resetDatabase = async () => {
      try {
        await localforage.removeItem('sigapp-db')
        dbService.db = new dbService.SQL.Database()
        dbService.createTables()
        await dbService.save()
        confirmReset.value = false
        $q.notify({ type: 'negative', message: 'Base de datos eliminada' })
        window.location.reload()
      }
      catch (err) {
        console.error('Error al eliminar la base:', err)
        $q.notify({ type: 'negative', message: 'Error al eliminar la base' })
      }
    }

    return {
      drawer,
      confirmReset,
      essentialLinks,
      toggleDrawer,
      exportDatabase,
      onFileChange,
      resetDatabase
    }
  }
}
</script>

<style>
.fit {
  flex: 1 1 auto;
}
</style>
