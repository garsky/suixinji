Component({
  properties: {
    bill: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.properties.bill._id })
    }
  }
})
