Component({
  properties: {
    categories: {
      type: Array,
      value: []
    }
  },

  data: {
    selectedCategory: ''
  },

  methods: {
    onSelectCategory(e) {
      const { category } = e.currentTarget.dataset
      this.setData({ selectedCategory: category })
      this.triggerEvent('pick', { category })
    },

    onClose() {
      this.triggerEvent('close')
    },

    onMaskTap() {
      this.onClose()
    }
  }
})
