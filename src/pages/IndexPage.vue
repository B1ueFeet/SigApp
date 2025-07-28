<!-- src/pages/IndexPage.vue -->
<template>
  <q-page padding>
    <client-form v-model="cliente" @onClientSelected="(n) => this.cliente = n" />

    <q-card class="q-mt-lg">
      <q-card-section class="row items-center q-gutter-sm">
        <q-select v-model="selectedProdId" :options="productOptions" option-value="id" option-label="common_name"
          label="Selecciona producto" emit-value map-options style="width: 300px"
          @update:model-value="onSelectProduct" />
        <q-input v-model.number="itemQuantity" type="number" label="Cantidad" style="width: 80px"
          input-class="text-right" @input="onQuantityInput" />
        <q-input v-model="itemPrice" type="text" inputmode="decimal" label="Valor unitario" style="width: 100px"
          input-class="text-right" @input="onRowPriceInput({ unit_price: itemPrice })" />
        <q-btn label="Añadir a cotización" color="primary" @click="addQuotationItem" />
      </q-card-section>

      <q-card-section class="row items-center q-gutter-sm">
        <q-checkbox v-model="applyTaxes" label="Incluir IVA (15%)" />
        <q-input v-model.number="discountAmount" type="number" label="Descuento" style="width: 100px" min="0"
          input-class="text-right" />
      </q-card-section>
    </q-card>

    <q-table class="q-mt-lg" :rows="quotationItems" :columns="columns" row-key="id" flat bordered dense>
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td auto-width>{{ props.row.unit }}</q-td>
          <q-td>
            <q-input dense v-model="props.row.description" style="width: 100%;" />
          </q-td>
          <q-td auto-width class="text-right">
            <q-input dense type="number" v-model.number="props.row.quantity" style="width: 50px;"
              input-class="text-right" />
          </q-td>
          <q-td auto-width class="text-right">
            <q-input dense inputmode="decimal" v-model="props.row.unit_price" style="width: 100px;"
              input-class="text-right" />
          </q-td>
          <q-td auto-width class="text-right">
            {{ (props.row.quantity * parseFloat(props.row.unit_price || 0)).toFixed(2) }}
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <q-card flat class="q-mt-md" style="max-width: 300px; margin-left: auto;">
      <q-card-section>
        <div class="q-gutter-y-sm" style="display: grid; grid-template-columns: 1fr 1fr;">
          <div><strong>SUBTOTAL</strong></div>
          <div class="text-right">$ {{ subtotal.toFixed(2) }}</div>
          <div><strong>IVA (15%)</strong></div>
          <div class="text-right">$ {{ ivaAmount.toFixed(2) }}</div>
          <div><strong>DESCUENTO</strong></div>
          <div class="text-right">- $ {{ discountAmount.toFixed(2) }}</div>
          <div><strong>TOTAL</strong></div>
          <div class="text-right">{{ totalAmount.toFixed(2) }}</div>
        </div>
      </q-card-section>
    </q-card>

    <q-btn label="Exportar PDF" color="secondary" class="q-mt-md" @click="exportPdf" />

    <q-dialog v-model="showProductDialog" persistent maximized>
      <q-card style="min-width:50vw; max-width:95vw">
        <q-card-section class="row justify-between items-center">
          <div class="text-h6">Crear / Editar producto</div>
          <q-btn icon="close" flat round dense @click="cancelNewProduct" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <product-form ref="prodForm" @added="onProductSaved" @saved="onProductSaved" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ClientForm from 'components/ClientForm.vue'
import ProductForm from 'components/ProductForm.vue'
import dbService from 'src/services/db'

export default {
  name: 'IndexPage',
  components: { ClientForm, ProductForm },
  data() {
    return {
      cliente: { nombre: '', direccion: '', ruc: '' },
      productOptions: [],
      selectedProdId: null,
      itemQuantity: 1,
      itemPrice: '',
      quotationItems: [],
      applyTaxes: false,
      discountAmount: 0,
      showProductDialog: false,
      columns: [
        { name: 'unit', label: 'U.', field: 'unit', headerAlign: 'center' },
        { name: 'description', label: 'Descripción', field: 'description', headerAlign: 'center' },
        { name: 'quantity', label: 'Cantidad', field: 'quantity', headerAlign: 'center', align: 'right' },
        { name: 'unit_price', label: 'V. unitario', field: 'unit_price', headerAlign: 'center', align: 'right' },
        { name: 'total', label: 'V. total', field: 'total', headerAlign: 'center', align: 'right' }
      ]
    }
  },
  computed: {
    subtotal() {
      return this.quotationItems.reduce(
        (sum, r) => sum + r.quantity * parseFloat(r.unit_price || 0),
        0
      )
    },
    ivaAmount() {
      return this.applyTaxes ? this.subtotal * 0.15 : 0
    },
    totalAmount() {
      return this.subtotal + this.ivaAmount - (Number(this.discountAmount) || 0)
    }
  },
  methods: {
    loadProductOptions() {
      const prodRows = dbService.db.exec(`
        SELECT id, common_name, unit, description, price
        FROM products
      `)[0]?.values || []

      let materialsMap = {}

      try {
        const exists = dbService.db.exec(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name='product_materials'
        `)[0]?.values?.length > 0

        if (exists) {
          const matRows = dbService.db.exec(`
            SELECT pm.product_id, m.name
            FROM product_materials pm
            JOIN materials m ON pm.material_id = m.id
          `)[0]?.values || []

          matRows.forEach(([prodId, mat]) => {
            if (!materialsMap[prodId]) {
              materialsMap[prodId] = []
            }
            if (!materialsMap[prodId].includes(mat)) {
              materialsMap[prodId].push(mat)
            }
          })
        }
      }
      catch (e) {
        console.warn('product_materials no existe, omitiendo carga de materiales')
      }

      this.productOptions = [{ id: 0, common_name: 'Nuevo producto', unit: '', description: '', price: '0.00', materials: [] }]
      prodRows.forEach(([id, name, unit, desc, price]) => {
        this.productOptions.push({
          id,
          common_name: name,
          unit,
          description: desc,
          price: parseFloat(price).toFixed(2),
          materials: materialsMap[id] || []
        })
      })
    },
    onSelectProduct(val) {
      this.selectedProdId = val
      if (val === 0) {
        this.$nextTick(() => this.$refs.prodForm.resetSelection())
        this.showProductDialog = true
      }
      else {
        const p = this.productOptions.find(o => o.id === val)
        this.itemQuantity = 1
        this.itemPrice = p ? p.price : ''
      }
    },
    onQuantityInput(v) { this.itemQuantity = v },
    onRowPriceInput(row) {
      row.unit_price = (row.unit_price || '').replace(/[^0-9.]/g, '')
    },
    addQuotationItem() {
      if (this.selectedProdId > 0) {
        const p = this.productOptions.find(o => o.id === this.selectedProdId)
        this.quotationItems.push({
          id: Date.now(),
          unit: p.unit,
          description: p.description,
          quantity: this.itemQuantity,
          unit_price: this.itemPrice,
          materials: p.materials
        })
      }
    },
    onProductSaved() {
      this.showProductDialog = false
      this.selectedProdId = null
      this.loadProductOptions()
    },
    cancelNewProduct() {
      this.showProductDialog = false
      this.selectedProdId = null
    },
    getCity() {
      return new Promise(resolve => {
        if (!navigator.geolocation) {
          resolve('')
          return
        }
        navigator.geolocation.getCurrentPosition(async pos => {
          try {
            const { latitude, longitude } = pos.coords
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            )
            const data = await resp.json()
            const city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              ''
            resolve(city)
          } catch {
            resolve('')
          }
        }, () => resolve(''))
      })
    },
    async exportPdf() {
      const doc = new jsPDF({ unit: 'pt', format: 'A4' })
      doc.setFontSize(14)
      const city = await this.getCity()
      const today = new Date()
      const dateStr = today.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      const pageWidth = doc.internal.pageSize.getWidth()
      doc.text(
        `${city || 'Ciudad desconocida'}, ${dateStr}`,
        pageWidth - 40,
        40,
        { align: 'right' }
      )
      
      console.log('Cliente:', this.cliente)
      const y0 = 60
      doc.text(`Nombre:\t\t${this.cliente.name}`, 40, y0)
      doc.text(`CELULAR:\t\t${this.cliente.phone}`, 40, y0 + 30)
      doc.text(`Dirección:\t\t ${this.cliente.sector}`, 40, y0 + 15)


      const cols = [
        { header: 'U.', dataKey: 'unit' },
        { header: 'Descripción', dataKey: 'description' },
        { header: 'Cantidad', dataKey: 'quantity' },
        { header: 'V. unitario', dataKey: 'unit_price' },
        { header: 'V. total', dataKey: 'total' }
      ]
      const rows = this.quotationItems.map(item => ({
        unit: item.unit,
        description: item.description,
        quantity: item.quantity,
        unit_price: `$ ${parseFloat(item.unit_price).toFixed(2)}`,
        total: `$ ${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}`
      }))

      autoTable(doc, {
        startY: y0 + 50,
        head: [cols.map(c => c.header)],
        body: rows.map(r => cols.map(c => r[c.dataKey])),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      })

      const afterTableY = doc.lastAutoTable.finalY + 30

      const allMats = this.quotationItems.flatMap(i => i.materials)
      const uniqueMats = Array.from(new Set(allMats))
      if (uniqueMats.length) {
        doc.setFontSize(14)
        doc.text('MATERIALES', 40, afterTableY)
        doc.setFontSize(11)
        uniqueMats.forEach((mat, i) => {
          doc.text(`• ${mat}`, 60, afterTableY + 15 + i * 15)
        })
      }

      const filename = `cotizacion_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
    }
  },
  mounted() {
    this.loadProductOptions()
  }
}
</script>
