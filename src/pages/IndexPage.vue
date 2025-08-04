<!-- src/pages/IndexPage.vue -->
<template>
  <q-page padding class="relative-position">
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


    <q-dialog v-model="dialog" backdrop-filter="blur(4px) saturate(150%)">
      <q-card>
        <q-card-section class="row items-center q-pb-none text-h6">
          {{ dialogTitle }}
        </q-card-section>

        <q-card-section>
          {{ alertMessage }}.
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-list bordered class="q-pa-md" style="max-width: 100%">
      <q-item>
        <q-item-section>
          <q-toggle v-model="enableCliente" label="Incluir datos de Cliente" dense />
        </q-item-section>
      </q-item>
      <q-separator />
      <q-expansion-item group="cotizacion" icon="perm_identity" label="Datos del Cliente" header-class="text-primary"
        :disable="!enableCliente" v-model="clienteOpen" @before-toggle="onBeforeToggleCliente">
        <client-form v-model="cliente" @onClientSelected="(n) => this.cliente = n" />
      </q-expansion-item>
    </q-list>

    <q-list bordered class="q-pa-md" style="max-width: 100%">
      <q-expansion-item group="secciones" icon="settings" label="Secciones del Documento" header-class="text-primary"
        v-model="sectionsOpen">
        <q-item>
          <q-item-section>
            <q-toggle v-model="enableMaterials" label="Incluir Seccion de Materiales" dense />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-toggle v-model="enableTiempoEntrega" label="Incluir Seccion de Tiempo de Entrega" dense />
          </q-item-section>
          <q-item-section>
            <q-input v-model.number="workDays" :disable="!enableTiempoEntrega" type="number" label="Días de trabajo"
              style="width: 140px" min="1" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-toggle v-model="enableFormaPago" label="Incluir Seccion de Forma de Pago" dense />
          </q-item-section>
          <q-item-section>
            <q-select v-model="selectedPaymentTerm" :options="paymentTermOptions" :disable="!enableFormaPago"
              label="Forma de pago" emit-value map-options style="width: 180px" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-toggle v-model="enableGarantia" label="Incluir Seccion de Garantía" dense />
          </q-item-section>
          <q-item-section>
            <q-input v-model.number="warrantyMaterialYears" :disable="!warrantyMaterialYears" type="number"
              label="Garantía material (años)" style="width: 200px" min="0" />
            <q-input v-model.number="warrantyWorkYears" :disable="!warrantyMaterialYears" type="number"
              label="Garantía trabajo (años)" style="width: 200px" min="0" />
          </q-item-section>
        </q-item>
      </q-expansion-item>
    </q-list>


    <q-list bordered class="q-pa-md" style="max-width: 100%">
      <q-expansion-item group="tabla" icon="edit" label="Datos de tabla" header-class="text-primary"
        v-model="tablaOpen">
        <q-item>
          <q-item-section>
            <q-input v-model="quotationTitle" label="COTIZACION PARA? ..." type class="q-pa-xs" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-checkbox v-model="applyTaxes" label="Incluir IVA (15%)" />
          </q-item-section>
          <q-item-section>
            <q-input v-model.number="discountAmount" type="number" label="Descuento" min="0" input-class="text-right" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Términos y condiciones</q-item-label>
          </q-item-section>
        </q-item>
        <q-item-section>
          <q-item v-for="(term, i) in termsOptions" :key="i">
            <q-checkbox v-model="selectedTerms" :val="term" :label="term" />
          </q-item>
        </q-item-section>
      </q-expansion-item>
    </q-list>


    <q-list bordered class="q-pa-md" style="max-width: 100%">
      <q-item>
        <q-item-section>
          <q-select v-model="selectedProdId" :options="productOptions" option-value="id" option-label="common_name"
            label="Selecciona producto" emit-value map-options style="width: 100%"
            @update:model-value="onSelectProduct" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-input v-model.number="itemQuantity" type="number" inputmode="decimal" label="Cantidad" style="width: 80px"
            input-class="text-right" @input="onQuantityInput" />
        </q-item-section>
        <q-item-section>
          <q-input v-model="itemPrice" type="number" inputmode="decimal" label="V. Unitario" style="width: 100px"
            input-class="text-right" @input="onRowPriceInput({ unit_price: itemPrice })" />
        </q-item-section>
        <q-item-section>
          <q-btn label="+" color="primary" @click="addQuotationItem" />
        </q-item-section>
      </q-item>
    </q-list>

    <q-table class="q-mt-lg" :rows="quotationItems" :columns="columns" row-key="id" flat bordered dense
      :rows-per-page-options="[0]" :rows-per-page="0" hide-bottom>
      <template v-slot:header="props">
        <!-- CABECERA NORMAL -->
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="{ 'text-align': col.align || 'left' }">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>
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
          <q-td auto-width class="text-center">
            <q-btn dense flat round icon="delete" color="negative" @click="removeQuotationItem(props.row.id)" />
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

    <q-card flat class="q-mt-md" style="max-width: 300px; margin-left: auto;">
      <q-card-section>
        <div  style="height: 7vh; grid-template-columns: 1fr 1fr;">
        </div>
      </q-card-section>
    </q-card>

    <q-page-sticky position="bottom-left" :offset="[18, 18]">
      <q-btn fab icon="download" :color="buttonColor" :label="buttonLabel" @click="onExportPdf"
        :disable="isTableEmpty" />
    </q-page-sticky>

    <q-page-sticky position="bottom-left" :offset="[18, 18 * 5]">
      <q-btn fab icon="autorenew" color="primary" @click="resetForm" :disable="isTableEmpty" />
    </q-page-sticky>

    <q-inner-loading :showing="isLoading">
      <q-spinner-gears size="50%" color="sigblue" />
    </q-inner-loading>
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
      //DATOS DE ACORDEON
      enableCliente: false,
      enableMaterials: true,
      enableTiempoEntrega: true,
      enableFormaPago: true,
      enableGarantia: true,

      clienteOpen: false,
      tablaOpen: false,
      sectionsOpen: false,
      savedClienteOpen: false,

      termsOptions: [
        'La propuesta no incluye el valor de IVA',
        'La propuesta incluye el valor de IVA',
        'El cliente se compromete en proporcionar un lugar adecuado para el almacenamiento de herramientas y material',
        'El metraje es aproximado, en caso de exceder el mismo se cobrarán cargos adicionales',
        'Trabajos adicionales se realizarán con aprobación escrita del cliente'
      ],
      selectedTerms: [],

      //DATOS DE CARGA
      isLoading: false,

      // DIALOG
      dialog: false,
      dialogTitle: '',
      alertMessage: '',

      // DATOS DE EDICION 
      editingId: null,

      cliente: { id: '-1', nombre: '', direccion: '', ruc: '' },
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
        { name: 'total', label: 'V. total', field: 'total', headerAlign: 'center', align: 'right' },
        { name: 'Eliminar', label: 'Acciones', field: 'actions', headerAlign: 'center' }

      ],
      quotationTitle: '',
      workDays: 3,
      warrantyMaterialYears: 10,
      warrantyWorkYears: 10,
      paymentTermOptions: [
        '10 90', '20 80', '30 70', '40 60', '50 50',
        '60 40', '70 30', '80 20', '90 10'
      ],
      selectedPaymentTerm: '70 30'
    }
  },
  watch: {
    enableCliente(newVal) {
      if (!newVal) {
        this.savedClienteOpen = this.clienteOpen
        this.clienteOpen = false
      }
      else {
        this.clienteOpen = this.savedClienteOpen
      }
    },
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
    },
    isTableEmpty() {
      return this.quotationItems.length === 0
    },
    buttonColor() {
      return this.isTableEmpty ? 'grey-5' : 'accent'
    },
    buttonLabel() {
      return this.isTableEmpty ? '' : 'Cotizar'
    }
  },
  methods: {
    //METODODS DE ACORDEON
    onBeforeToggleCliente(evt) {
      if (!this.enableCliente) {
        evt.preventDefault()
      }
    },

    removeQuotationItem(itemId) {
      this.quotationItems = this.quotationItems.filter(
        item => item.id !== itemId
      )
    },
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

      this.productOptions = [{ id: 0, common_name: 'Editar/ Agregar Prodducto', unit: '', description: '', price: '0.00', materials: [] }]
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
          materials: dbService.loadProductMaterials(this.selectedProdId)
        })
        console.log('item añadido:', this.selectedProdId)
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

    showDialog(type, message) {
      this.alertMessage = message
      this.dialogTitle = type === 'error' ? 'Error' : 'Información'
      this.dialog = true
    },

    formatAmount(val) {
      const num = Number(val).toFixed(2)
      const padded = num.padStart(8, ' ')
      return '$  ' + padded
    },
    async onExportPdf() {
      this.isLoading = true
      try {
        await this.saveQuotationToDb()
      }
      catch (err) {
        const errorMessage = 'Error al GUARDAR COTIZACION: ' + (err.message || err)
        console.error('Error al guardar cotizacon:', err)
        this.showDialog('error', errorMessage)
        this.isLoading = false
        return
      }
      finally {

        try {
          await this.exportPdf()
        } catch (err) {
          const errorMessage = 'Error al generar el PDF: ' + (err.message || err)
          console.error('Error al generar PDF:', err)
          this.showDialog('error', errorMessage)
          this.isLoading = false

        }
        finally {
          this.isLoading = false

        }
      }
    },
    resetForm() {
      // Reinicia flags de secciones
      this.enableCliente = false
      this.enableMaterials = true
      this.enableTiempoEntrega = true
      this.enableFormaPago = true
      this.enableGarantia = true

      this.clienteOpen = false
      this.sectionsOpen = false
      this.tablaOpen = false

      //  Reinicia datos de cliente y términos
      this.cliente = { id: '-1', nombre: '', direccion: '', ruc: '' }
      this.selectedTerms = []

      //  Vacía la tabla de ítems y selección de producto
      this.quotationItems = []
      this.selectedProdId = null
      this.itemQuantity = 1
      this.itemPrice = ''

      // Reinicia inputs de la sección “Datos de tabla”
      this.quotationTitle = ''
      this.applyTaxes = false
      this.discountAmount = 0

      //  Reinicia secciones “Avanzadas”
      this.workDays = 3
      this.warrantyMaterialYears = 10
      this.warrantyWorkYears = 10
      this.selectedPaymentTerm = '70 30'

      // Vuelve a cargar catálogo de productos
      this.loadProductOptions()
    },

    async saveQuotationToDb() {
      console.log(`CLIENTE QUE SERA GUARDADO: ${this.cliente.name} con el id ${this.cliente.id}`)
      const quotationData = {
        client_id: this.enableCliente && this.cliente.id ? this.cliente.id : null,
        title: this.quotationTitle,
        apply_taxes: this.applyTaxes,
        discount: this.discountAmount,
        terms: this.selectedTerms,
        work_days: this.workDays,
        payment_term: this.selectedPaymentTerm,
        warranty_material: this.warrantyMaterialYears,
        warranty_work: this.warrantyWorkYears
      }

      console.log('Datos de cotización:', quotationData)


      const items = this.quotationItems.map(item => ({
        productId: item.id,
        unit: item.unit,
        description: item.description,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        materials: item.materials
      }))

      console.log('Items de cotización:', items)
      const newId = await dbService.saveQuotation(quotationData, items)
      console.log('Cotización guardada con ID', newId)
    },

    async exportPdf() {
      const doc = new jsPDF({ unit: 'pt', format: 'A4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const logoSize = 100
      const gradientSize = 80
      const logoX = 20
      const logoY = 20
      const indent = 140
      const bottomMargin = 60
      const topMarginAfterBreak = logoY + logoSize + 30
      const lineHeight = 15

      const drawHeader = () => {
        doc.addImage('/logo.png', 'PNG', logoX, logoY, logoSize, logoSize)
        const gradY = logoY + logoSize
        const gradHeight = pageHeight - gradY
        const canvas = document.createElement('canvas')
        canvas.width = gradientSize
        canvas.height = gradHeight
        const ctx = canvas.getContext('2d')
        const grad = ctx.createLinearGradient(0, 0, 0, gradHeight)
        grad.addColorStop(0, 'rgba(232,165,53,0)')
        grad.addColorStop(1, 'rgba(232,165,53,1)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, gradientSize, gradHeight)
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 30, gradY, gradientSize, gradHeight)
      }

      const drawFooter = () => {
        const footerY = pageHeight - 30
        doc.setFontSize(10)
        doc.text('+593 985848102', indent, footerY)
        doc.text('fym.sanchez@gmail.com', pageWidth - indent, footerY, { align: 'right' })
      }

      const ensurePage = y => {
        if (y > pageHeight - bottomMargin) {
          doc.addPage()
          drawHeader()
          drawFooter()
          return topMarginAfterBreak
        }
        return y
      }



      drawHeader()
      drawFooter()

      const city = await this.getCity()
      const today = new Date()
      const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      doc.text(`${city || 'Ciudad desconocida'}, ${dateStr}`, pageWidth - 40, logoY + 50, { align: 'right' })

      const startY = logoY + 80
      const labelX = indent
      // calculamos dinámicamente el ancho de la etiqueta más larga
      doc.setFont('helvetica', 'bold')
      const labels = ['Sr(a):', 'Dirección:', 'Telf.:', 'Pago:']
      const maxLabelWidth = Math.max(...labels.map(l => doc.getTextWidth(l)))
      const valueX = labelX + maxLabelWidth + 20  // 10pt de espacio entre label y valor

      doc.setFontSize(11)

      // Sr(a).
      const y0 = startY
      doc.setFont('helvetica', 'bold')
      doc.text('Sr(a):', labelX, y0)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${this.enableCliente ? (this.cliente.name || 'A Quien Corresponda') : 'A Quien Corresponda'}`,
        valueX,
        y0
      )
      // Dirección
      const y1 = startY + 15
      doc.setFont('helvetica', 'bold')
      doc.text('Dirección:', labelX, y1)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${this.enableCliente ? (this.cliente.sector || city) : city}`,
        valueX,
        y1
      )
      // Teléfono
      const y2 = startY + 30
      doc.setFont('helvetica', 'bold')
      doc.text('Telf.:', labelX, y2)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${this.enableCliente ? (this.cliente.phone || '---------------') : '---------------'}`,
        valueX,
        y2
      )

      // Pago
      const y3 = startY + 45
      doc.setFont('helvetica', 'bold')
      doc.text('Pago:', labelX, y3)
      doc.setFont('helvetica', 'normal')
      doc.text('Por Acordar', valueX, y3)


      const cols = [
        { header: 'U.', dataKey: 'unit' },
        { header: 'DESCRIPCIÓN', dataKey: 'description' },
        { header: 'CANT.', dataKey: 'quantity' },
        { header: 'V. UNITARIO', dataKey: 'unit_price' },
        { header: 'V. TOTAL', dataKey: 'total' }
      ]
      const rows = this.quotationItems.map(item => ({
        unit: item.unit,
        description: item.description,
        quantity: item.quantity,
        unit_price: `$ ${parseFloat(item.unit_price).toFixed(2)}`,
        total: `$ ${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}`
      }))


      const tableWidth = pageWidth - indent
      const colWidths = {
        unit: tableWidth * 0.06,
        description: tableWidth * 0.55,
        quantity: tableWidth * 0.09,
        unit_price: tableWidth * 0.15,
        total: tableWidth * 0.15
      }

      autoTable(doc, {
        startY: startY + 70,
        margin: { left: indent - 15, right: 10 },

        head: [
          [
            {
              content: `COTIZACIÓN PARA ${this.quotationTitle.toUpperCase() || 'IMPERMEABILIZACIÓN DE SUPERFICIE'}`,
              colSpan: cols.length,
              styles: {
                halign: 'center',
                fontSize: 12,
                fontStyle: 'bold',
                textColor: [0, 0, 0],
                fillColor: [255, 255, 255]
              }
            }
          ],
          cols.map(c => c.header)
        ],

        body: rows.map(r => cols.map(c => r[c.dataKey])),

        foot: [
          [
            { content: '', colSpan: 2 },
            {
              content: 'SUBTOTAL',
              colSpan: 2,
              styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255] }
            },
            {
              content: this.formatAmount(this.subtotal),
              styles: {
                fillColor: [40, 40, 91],
                textColor: [255, 255, 255],
                halign: 'right'
              }
            }
          ],
          [
            { content: '', colSpan: 2 },
            {
              content: 'I.V.A. (15%)',
              colSpan: 2,
              styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255] }
            },
            {
              content: this.formatAmount(this.ivaAmount),
              styles: {
                fillColor: [40, 40, 91],
                textColor: [255, 255, 255],
                halign: 'right'
              }
            }
          ],
          ...(this.discountAmount > 0
            ? [[
              { content: '', colSpan: 2 },
              {
                content: 'DESCUENTO',
                colSpan: 2,
                styles: { fillColor: [232, 165, 53], textColor: [255, 255, 255] }
              },
              {
                content: this.formatAmount(-this.discountAmount),
                styles: {
                  fillColor: [232, 165, 53],
                  textColor: [255, 255, 255],
                  halign: 'right'
                }
              }
            ]]
            : []),
          [
            { content: '', colSpan: 2 },
            {
              content: 'TOTAL',
              colSpan: 2,
              styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255] }
            },
            {
              content: this.formatAmount(this.totalAmount),
              styles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                halign: 'right',
                fontStyle: 'bold'
              }
            }
          ]
        ],

        theme: 'grid',

        styles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          cellPadding: 5,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [0, 0, 0],
          lineWidth: 1.0
        },

        columnStyles: {
          0: { cellWidth: colWidths.unit },
          1: { cellWidth: colWidths.description, overflow: 'linebreak' },
          2: {
            cellWidth: colWidths.quantity,
            halign: 'right',
            fillColor: [40, 40, 91],
            textColor: [255, 255, 255]
          },
          3: {
            cellWidth: colWidths.unit_price,
            halign: 'right',
            fillColor: [40, 40, 91],
            textColor: [255, 255, 255]
          },
          4: {
            cellWidth: colWidths.total,
            halign: 'right'
          }
        },

        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },

        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },

        didParseCell: data => {
          if (
            data.section === 'body' &&
            ['quantity', 'unit_price', 'total'].includes(data.column.dataKey)
          ) {
            data.cell.styles.fillColor = [40, 40, 91]
            data.cell.styles.textColor = [255, 255, 255]
          }
          if (data.section === 'foot' && data.column.index < 2) {
            data.cell.styles.lineWidth = 0
            data.cell.styles.lineColor = [255, 255, 255]
          }
        },

        didDrawCell: data => {
          if (
            data.section === 'foot' &&
            data.row.index === 0 &&
            data.column.index < 2
          ) {
            const { x, y, width } = data.cell
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(1.0)
            doc.line(x, y, x + width, y)
          }
        }
      })

      let summaryY = doc.lastAutoTable.finalY + 13
      doc.setFontSize(8)
      console.log('Seleccionados:', this.selectedTerms)
      this.selectedTerms.forEach((term) => {
        summaryY = ensurePage(summaryY)
        doc.setFont('helvetica', 'bold')
        const desc = doc.splitTextToSize(term, pageWidth - indent - 20)
        const termHeight = desc.length * 10
        desc.forEach((line, j) => {
          doc.text(j == 0 ? `* ${line}` : line, indent - 10, summaryY + j * lineHeight)
        })
        doc.setFont('helvetica', 'normal')
        summaryY += lineHeight
      })


      doc.setFontSize(12)
      summaryY = ensurePage(summaryY + 15)
      // SECCION MATERIALES 

      if (this.enableMaterials) {
        // 1) Aplana todos los arrays de IDs que devuelve loadProductMaterials(item.id)
        const allMatIds = this.quotationItems.flatMap(item => {
          const materials = item.materials
          return materials
        })
        console.log('Todos los IDs de materiales:', allMatIds)

        const allMats = dbService.loadMaterials()

        // 2) Deduplica con Set
        const uniqueMatIds = [...new Set(allMatIds)]
        console.log('IDs únicos de materiales:', uniqueMatIds)  // [1,3]

        // 3) (Opcional) Si quieres el objeto completo de cada material:
        const idSet = new Set(uniqueMatIds)
        const uniqueMats = allMats.filter(mat => idSet.has(mat.id))
        console.log('Materiales únicos en la cotización:', uniqueMats)

        this.quotationItems.forEach(item => {
          console.log('Item actual:', item)
          const itemMaterials = dbService.loadProductMaterials(item.id)
          console.log('Materiales del item:', itemMaterials)
        })
        if (uniqueMats.length) {
          summaryY = ensurePage(summaryY)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('MATERIALES:', indent, summaryY)
          doc.setFont('helvetica', 'normal')

          let cursorY = summaryY + 15

          uniqueMats.forEach(m => {
            cursorY = ensurePage(cursorY)
            const fullText = `• ${m.name}: ${m.description}`
            const maxWidth = pageWidth - indent - 15 - 40
            const lines = doc.splitTextToSize(fullText, maxWidth)
            lines.forEach((textLine, i) => {
              if (i === 0) {
                const boldPart = `• ${m.name}: `
                doc.setFont('helvetica', 'bold')
                doc.text(boldPart, indent + 10, cursorY)
                const boldWidth = doc.getTextWidth(boldPart)
                doc.setFont('helvetica', 'normal')
                const restLine = textLine.slice(boldPart.length)
                doc.text(restLine, indent + boldWidth + 15, cursorY)
              }
              else {
                doc.setFont('helvetica', 'normal')
                doc.text(textLine, indent + 15, cursorY)
              }
              cursorY += lineHeight
            })
            cursorY += 5
          })
          summaryY = cursorY + 10
        }
      }

      let cursorY2 = ensurePage(summaryY)

      // SECCION TIEMPO DE ENTREGA
      if (this.enableTiempoEntrega) {
        doc.setFont('helvetica', 'bold')
        doc.text('TIEMPO DE ENTREGA:', indent, cursorY2)
        doc.setFont('helvetica', 'normal')
        cursorY2 += lineHeight
        const entregaLines = doc.splitTextToSize(
          `${this.workDays} días laborables (sujeto a clima)`,
          pageWidth - indent - 40
        )
        entregaLines.forEach(line => {
          cursorY2 = ensurePage(cursorY2)
          doc.text(line, indent + 20, cursorY2)
          cursorY2 += lineHeight
        })
        cursorY2 += 10
      }

      // SECCION FORMA DE PAGO
      if (this.enableFormaPago) {
        cursorY2 = ensurePage(cursorY2)
        doc.setFont('helvetica', 'bold')
        doc.text('FORMA DE PAGO:', indent, cursorY2)
        doc.setFont('helvetica', 'normal')
        cursorY2 += lineHeight;
        const [first, second] = this.selectedPaymentTerm.split(' ');
        [
          `• ${first}% a la firma del contrato.`,
          `• ${second}% al término de la obra.`
        ].forEach(line => {
          cursorY2 = ensurePage(cursorY2)
          doc.text(line, indent + 20, cursorY2)
          cursorY2 += lineHeight
        })
        cursorY2 += 10
      }

      // SECCION GARANTÍA
      if (this.enableGarantia) {
        cursorY2 = ensurePage(cursorY2)
        doc.setFont('helvetica', 'bold')
        doc.text('GARANTÍA:', indent, cursorY2)
        doc.setFont('helvetica', 'normal')
        cursorY2 += lineHeight
        const garanLines = doc.splitTextToSize(
          `La empresa ofrece ${this.warrantyMaterialYears} años por defectos de material y ${this.warrantyWorkYears} años por defectos de instalación. No cubre acciones de terceros, sismos ni casos fortuitos.`,
          pageWidth - indent - 40
        )
        garanLines.forEach(line => {
          cursorY2 = ensurePage(cursorY2)
          doc.text(line, indent + 20, cursorY2)
          cursorY2 += lineHeight
        })
      }


      // SECCION FIRMA
      cursorY2 += 50
      const sigWidth = 150
      const sigHeight = 50

      const signatureBlockHeight = 50 + sigHeight + 10 + 1 + 15 + (11 * 2) + 5

      function ensureBlockFits(y, blockHeight) {
        if (y + blockHeight > pageHeight - bottomMargin) {
          doc.addPage()
          drawHeader()
          drawFooter()
          return topMarginAfterBreak
        }
        return y
      }
      cursorY2 = ensureBlockFits(cursorY2, signatureBlockHeight)
      const sigX = (pageWidth - sigWidth + indent) / 2
      doc.addImage('/firma.png', 'PNG', sigX - 10, cursorY2 - 50, sigWidth + 30, sigHeight + 10)
      doc.setLineWidth(0.5)
      doc.line(sigX, cursorY2, (pageWidth + sigWidth + indent) / 2, cursorY2)
      doc.setFontSize(11)
      doc.text('Téc. Francisco Sánchez', (pageWidth + indent) / 2, cursorY2 + 15, { align: 'center' })
      doc.text('Director de Área Técnica', (pageWidth + indent) / 2, cursorY2 + 30, { align: 'center' })

      console.log('CLIENTE:', this.cliente)


      const nombre = String(this.cliente.name || 'CLIENTE').toUpperCase()
      const direccion = String(this.cliente.sector || 'DIRECCION').toUpperCase()

      const safe = s => String(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')

      const fileName = `COT_${safe(this.enableCliente ? nombre : 'SN')}_${safe(this.enableCliente ? direccion : city)}.pdf`
      doc.save(fileName)
    },
    async loadQuotationToEdit(id) {
      // 1) Recupera la cotización
      const full = dbService.loadQuotationById(id)
      if (!full) {
        this.showDialog('error', `Cotización #${id} no encontrada`)
        return
      }

      // 2) CLIENTE
      if (full.client_id) {
        this.enableCliente = true
        this.clienteOpen = true
        // Carga el cliente directo de la tabla:
        const row = dbService.db.exec(
          `SELECT id, name AS nombre, phone AS direccion, sector AS ruc
         FROM clients
         WHERE id = ?`,
          [full.client_id]
        )[0]?.values?.[0] || []
        this.cliente = {
          id: row[0],
          nombre: row[1],
          direccion: row[2],
          ruc: row[3]
        }


      }

      // 3) SECCIONES
      this.enableMaterials = true
      this.enableTiempoEntrega = true
      this.workDays = full.work_days
      this.enableFormaPago = true
      this.selectedPaymentTerm = full.payment_term
      this.enableGarantia = true
      this.warrantyMaterialYears = full.warranty_material
      this.warrantyWorkYears = full.warranty_work

      // 4) DATOS DE TABLA
      this.quotationTitle = full.title
      this.applyTaxes = full.apply_taxes
      this.discountAmount = full.discount
      this.selectedTerms = full.terms

      console.log('Datos de cotización cargados:', full)
      this.quotationItems = full.items.map(item => {
        // Buscamos en productOptions para tener unidad y descripción
        const prod = this.productOptions.find(p => p.id === item.productId) || {}
        console.log('Producto encontrado:', item)
        return {
          id: item.itemId,            // row-key único
          productId: item.productId,
          unit: item.unit || '',
          description: item.description || prod.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          materials: item.materials
        }
      })

    },


  },

  async mounted() {
    // 1) Asegura base y opciones de producto
    await dbService.initDatabase()
    this.loadProductOptions()

    const editId = Number(this.$route.query.editId)
    console.log('editId:', editId)
    if (editId >= 0) {
      console.log(' hay edición, iniciando  cotización')
      this.editingId = editId
      this.loadQuotationToEdit(editId)
    }
    else {
      // modo “nueva cotización”
      this.resetForm()
    }
  }
}
</script>
