(function (root) {
  // 闭包里的 this 指向 window
  if (typeof exports == "object") {
    module.exports = AreaPicker;
  } else if (typeof define === 'function' && 'define.cmd') {
    define([], function() {
      return AreaPicker;
    })
  } else {
    // 暴露给用户
    root.AreaPicker = AreaPicker; 
  }

  var documnet = window.document,

  $id = function(id) {
    return document.getElementById(id);
  },

  $class = function(name) {
    return arrayFrom(document.getElementsByClassName(name));
  },

  arrayFrom = function(arrayLike) {
    if (arrayLike) {
      return [].slice.call(arrayLike);
    }
  },

  /**
   * @param el {string} 
   */
  addEvent = function(action, el, cb) {
    document.body.addEventListener(action, function(e) {
      // 其实很多情况都是冒泡到自己= =
      if (el == e.target.tagName.toLowerCase() 
            || el == e.target.className 
            || el == e.target.id) {
        cb(e);
      }
    })
  },

  dfs = function(obj) {
    
  },

  // 默认选项
  defaultOpts = {
    // TODO color
    liHeight: 40, // px
  };
  
  /**
   * 构造函数
   */
  function AreaPicker(options) {
    var self = this,
        opts = self.config(options);
    self.container = $id(opts.container);
    self.columnList = [];
    self.level = 0;
    self.start = {
      x: 0,
      y: 0
    };
    self.verticalDis = 0;
    self.distanceList = [];
    self.initContent();
    self.renderContent(0, opts.data[0]);
    // 添加 EventListener 需要在 dom 初始化好之后
    // this.addEvents();
  }

  AreaPicker.prototype = {

    config: function(options) {
      // 用 try catch 来兼容 Object api ? 懒得写。。
      try {
        if (!this._o) {
          this._o = Object.assign({}, defaultOpts);
        } 
      } catch (e) {
        console.error('[config error]: ', e);
      }

      var opts = Object.assign(this._o, options);
      return opts;
    },

    initContent: function() {
      var bg = document.createElement('div');
      bg.setAttribute('class', 'area-picker-bg');
      document.body.appendChild(bg);
      this.container.setAttribute('class', 'area-picker-container');
      this.container.innerHTML = [
        '<div class="area-picker-content">',
          '<div class="area-picker-top-mask"></div>',
          '<div class="area-picker-bottom-mask"></div>',
          '<div class="area-picker-line"></div>',
        '</div>'
      ].join('');
      this.content = $class('area-picker-content')[0];
      // 初始化第一列
      this.columnList.push(this._o.data);
      this.renderColumn(0);
    },

    dfs: function(obj) {
      for (var prop in obj) {
        if (prop === 'child') {
          this.columnList.push(obj[prop]);
          // 只用检查默认位置的 child 这里默认都是0
          // 可以设置一个变量 初始显示位置
          return this.dfs(obj[prop][0]);
        }
      }
    },

    /**
     * @param level {Number}
     * @param target {Object}
     * 渲染从该层级之后的列，数据源是 target
     */
    renderContent: function(level, target) {
      if (!target) return;
      this.dfs(target); 
      for (var i = level + 1; i < this.columnList.length; i++) {
        this.renderColumn(i);
      }
      // this.addEvents();
    },
    
    renderColumn: function(level) {
      var pickerColumn = document.createElement('ul');
      pickerColumn.setAttribute('class', 'area-picker-column');
      pickerColumn.setAttribute('id', 'area-picker-column-' + level);
      this.content.appendChild(pickerColumn);
      pickerColumn.style.transform = 'translateY(' + 2 * this._o.liHeight + 'px)';
      // 添加 events
      this.touch(level, pickerColumn);
      this.distanceList[level] = {
        totalDis: 0,
        preVerticalDis: 0,
        actualDis : 0
      };
      this.renderColumnItem(level);
    },

    renderColumnItem: function(level) {
      var column = $id('area-picker-column-' + level),
          html = [];
      this.columnList[level].forEach(function(item) {
        // html.push('<li data-id=' + item.id + '>' + item.name + '</li>');
        // 看数据格式，需要的话可以加上其他数据
        html.push('<li>' + item.name + '</li>');
      });
      column.innerHTML = html.join('');
    },

    removeColumn: function(level) {
      var len = this.columnList.length;
      // 从该级起往后的都要重置
      for(var i = len - 1; i > level; i--) {
        this.content.removeChild($id('area-picker-column-' + i));
        this.columnList.splice(i, 1);
        this.distanceList[i] = {
          totalDis: 0,
          preVerticalDis: 0,
          actualDis : 0
        };
      }
    },

    checkPosition: function(level, totalDiff, diff) {
      // 移动过的个数 = 移动的距离 / liHeight
      var offset = Math.round(totalDiff / this._o.liHeight);
      // TODO 自动移动到合适位置
      if (offset !== 0 || Math.abs(diff) > 20 && offset === 0) {
        if (this.columnList[level][Math.abs(offset)]) {
          this.removeColumn(level);
          this.renderContent(level, this.columnList[level][Math.abs(offset)]);
        }
      }
    },

    checkBoundary: function(level, actualDis) {
      // translateY 范围只能在 初始 - (n - 1) * liHeight 之内
      return actualDis < 2 * this._o.liHeight + 10 
              && 
             actualDis > 3 * this._o.liHeight - this.columnList[level].length * this._o.liHeight - 10
    },

    touch: function(level, el) {
      var self = this;
      var $el = el;
      $el.addEventListener('touchstart', function(e) {
        self.start.y = e.touches[0].clientY;
      });
      $el.addEventListener('touchmove', function(e) {
        e.preventDefault();
        // 本次移动的距离
        var diff = e.touches[0].clientY - self.start.y; 
        // 第一次 pre 为 0
        var actualDis = self.distanceList[level].totalDis + e.touches[0].clientY - self.start.y + self._o.liHeight * 2;
        self.distanceList[level].actualDis = actualDis;
        // 在移动的时候检查只需要检查是否超出范围
        if (self.checkBoundary(level, actualDis)) {
          $el.style.transform = 'translateY(' + actualDis + 'px)';
        }
      }, false);
      $el.addEventListener('touchend', function(e) {
        self.distanceList[level].preVerticalDis = e.changedTouches[0].clientY - self.start.y;
        self.distanceList[level].totalDis += self.distanceList[level].preVerticalDis;
        // 结束时检查位置
        self.checkPosition(level, self.distanceList[level].totalDis, self.distanceList[level].preVerticalDis);
      });
    },

    // addEvents: function() {
    //   var self = this;
    //   for(var i = 0; i < self.columnList.length; i++) {
    //     this.distanceList[i] = {
    //       totalDis: 0, // 移动过的总垂直距离
    //       preVerticalDis: 0, // 记录的是上次移动的距离
    //       actualDis : 0 // 实际赋给 transform 的值 需要加上初始 offset 和 totalDis
    //     };
    //     // this.touch(i, 'area-picker-column-' + i);
    //   }
    // },
  }
  
})(window);