App({
  onLaunch() {
    this.globalData = {
      userInfo: null,
      categories: {
        expense: ['餐饮', '交通', '购物', '居住', '娱乐', '通讯', '医疗', '教育', '其他'],
        income: ['工资']
      },
      channels: ['花呗', '信用卡', '微信支付', '银行卡'],
      sources: ['支付宝', '微信', '银行'],
      defaultTemplates: [
        {
          name: '旅游专项',
          project_type: 'time',
          conditions: { date_from: '', date_to: '', category: null, merchant_keyword: null, amount_min: null, amount_max: null },
          actions: { add_tags: ['旅游专项'], set_project: '', set_level: 'extra' }
        },
        {
          name: '装修专项',
          project_type: 'keyword',
          conditions: { date_from: '', date_to: '', category: null, merchant_keyword: '', amount_min: null, amount_max: null },
          actions: { add_tags: ['装修专项'], set_project: '', set_level: 'extra' }
        },
        {
          name: '大额标记',
          project_type: null,
          conditions: { date_from: '', date_to: '', category: null, merchant_keyword: null, amount_min: 500, amount_max: null },
          actions: { add_tags: ['大额支出'], set_project: null, set_level: 'extra' }
        },
        {
          name: '出差期间',
          project_type: 'time',
          conditions: { date_from: '', date_to: '', category: null, merchant_keyword: null, amount_min: null, amount_max: null },
          actions: { add_tags: ['出差'], set_project: null, set_level: 'extra' }
        }
      ]
    }
  }
})
