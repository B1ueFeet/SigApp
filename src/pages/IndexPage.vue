<!-- src/pages/IndexPage.vue -->
<template>
  <q-page padding>
    <client-form v-model="cliente" @onClientSelected="(n) => this.cliente = n" />
    <q-card-section class="row items-center q-gutter-sm">
      <q-input v-model.number="workDays" type="number" label="Días de trabajo" style="width: 140px" min="1" />
      <q-input v-model.number="warrantyMaterialYears" type="number" label="Garantía material (años)"
        style="width: 200px" min="0" />
      <q-input v-model.number="warrantyWorkYears" type="number" label="Garantía trabajo (años)" style="width: 200px"
        min="0" />
      <q-select v-model="selectedPaymentTerm" :options="paymentTermOptions" label="Forma de pago" emit-value map-options
        style="width: 180px" />
    </q-card-section>

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
      <template v-slot:header="props">
        <q-tr>
          <q-th :colspan="columns.length" class="text-center">
            <q-input v-model="quotationTitle" placeholder="Ingrese título de la cotización" dense standout="bg-grey-2"
              class="q-pa-xs" />
          </q-th>
        </q-tr>
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
      ],
      quotationTitle: '',
      workDays: 3,
      warrantyMaterialYears: 0,
      warrantyWorkYears: 0,
      paymentTermOptions: [
        '10 90', '20 80', '30 70', '40 60', '50 50',
        '60 40', '70 30', '80 20', '90 10'
      ],
      selectedPaymentTerm: '70 30'
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
    formatAmount(val) {
      const num = Number(val).toFixed(2)
      const padded = num.padStart(8, ' ')
      return '$  ' + padded
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
      doc.setFontSize(11)
      doc.text(`Sr(a).:   \t${this.cliente.name}`, indent, startY)
      doc.text(`Dirección:\t${this.cliente.sector}`, indent, startY + 15)
      doc.text(`Telf.:    \t${this.cliente.phone}`, indent, startY + 30)
      const pago = 'Por Acordar'
      doc.text(`Pago:     \t${pago}`, indent, startY + 45)

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


      const tableWidth = pageWidth - indent - 10
      const colWidths = {
        unit: tableWidth * 0.05,
        description: tableWidth * 0.60,
        quantity: tableWidth * 0.08,
        unit_price: tableWidth * 0.10,
        total: tableWidth * 0.17
      }

      autoTable(doc, {
        startY: startY + 70,
        margin: { left: indent - 15, right: 10 },

        head: [
          // Título COTIZACIÓN sobre todas las columnas
          [
            {
              content: `COTIZACIÓN PARA ${this.quotationTitle || 'IMPERMEABILIZACION'}`,
              colSpan: cols.length,
              styles: {
                halign: 'center',
                fontSize: 14,
                fontStyle: 'bold',
                textColor: [0, 0, 0],
                fillColor: [255, 255, 255]
              }
            }
          ],
          // Encabezado normal
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
              content: `${this.formatAmount(this.subtotal)}`,
              styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255], halign: 'right' }
            },

          ],
          [
            { content: '', colSpan: 2 },
            {
              content: 'I.V.A. (15%)',
              colSpan: 2,
              styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255] }
            },
            {
              content: `${this.formatAmount(this.ivaAmount)}`,
              styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255], halign: 'right' }
            },
          ],
          ...(this.discountAmount > 0
            ? [[
              { content: '', colSpan: 2 },
              {
                content: 'DESCUENTO',
                colSpan: 2,
                styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255] }
              },
              {
                content: `${this.formatAmount(this.discountAmount)}`,
                styles: { fillColor: [40, 40, 91], textColor: [255, 255, 255], halign: 'right' }
              },
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
              content: `${this.formatAmount(this.totalAmount)}`,
              styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: 'right', fontStyle: 'bold' }
            },
          ]
        ],

        theme: 'grid',

        styles: {
          fontSize: 10,
          cellPadding: 4,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [0, 0, 0],   // líneas negras
          lineWidth: 0.8         // un poco más gruesas
        },

        columnStyles: {
          0: { cellWidth: colWidths.unit },
          1: { cellWidth: colWidths.description, overflow: 'linebreak' },
          2: { cellWidth: colWidths.quantity, halign: 'right', fillColor: [40, 40, 91], textColor: [255, 255, 255] },
          3: { cellWidth: colWidths.unit_price, halign: 'right', fillColor: [40, 40, 91], textColor: [255, 255, 255] },
          4: { cellWidth: colWidths.total, fillColor: [40, 40, 91], halign: 'right' }
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
        }
      })


      let summaryY = doc.lastAutoTable.finalY + 15

      const allMats = this.quotationItems
        .flatMap(i => i.materials.flatMap(id => dbService.loadMaterials(id)))
      const uniqueMats = allMats.filter((m, i, a) =>
        a.findIndex(x => x.id === m.id) === i
      )
      if (uniqueMats.length) {
        summaryY = ensurePage(summaryY)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('MATERIALES:', indent, summaryY)
        doc.setFont('helvetica', 'normal')

        let cursorY = summaryY + 15

        uniqueMats.forEach(m => {
          cursorY = ensurePage(cursorY)
          doc.setFont('helvetica', 'bold')
          doc.text(`• ${m.name}`, indent, cursorY)
          doc.setFont('helvetica', 'normal')
          cursorY += lineHeight

          const descLines = doc.splitTextToSize(m.description, pageWidth - indent - 40)
          descLines.forEach(line => {
            cursorY = ensurePage(cursorY)
            doc.text(line, indent + 20, cursorY)
            cursorY += lineHeight
          })

          cursorY += 5
        })

        summaryY = cursorY + 10
      }

      let cursorY2 = ensurePage(summaryY)

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
      cursorY2 += 5

      cursorY2 = ensurePage(cursorY2)
      doc.setFont('helvetica', 'bold')
      doc.text('FORMA DE PAGO:', indent, cursorY2)
      doc.setFont('helvetica', 'normal')
      cursorY2 += lineHeight;
      [
        `• ${this.selectedPaymentTerm}% a la firma del contrato.`,
        `• ${this.selectedPaymentTerm}% al término de la obra.`
      ].forEach(line => {
        cursorY2 = ensurePage(cursorY2)
        doc.text(line, indent + 20, cursorY2)
        cursorY2 += lineHeight
      })

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
      cursorY2 += 50


      cursorY2 = ensurePage(cursorY2)
      const sigWidth = 150
      const sigHeight = 50
      const sigX = (pageWidth - sigWidth + indent) / 2
      doc.addImage('/firma.png', 'PNG', sigX - 10, cursorY2, sigWidth + 30, sigHeight + 10)
      cursorY2 = ensurePage(cursorY2 + 50)
      doc.setLineWidth(0.5)
      doc.line(sigX, cursorY2, (pageWidth + sigWidth + indent) / 2, cursorY2)
      doc.setFontSize(11)
      doc.text('Téc. Francisco Sánchez', (pageWidth + indent) / 2, cursorY2 + 15, { align: 'center' })
      doc.text('Director de Área Técnica', (pageWidth + indent) / 2, cursorY2 + 30, { align: 'center' })

      doc.save(`cotizacion_${new Date().toISOString().slice(0, 10)}.pdf`)
    }


  },

  mounted() {
    this.loadProductOptions()
  }
}
</script>
