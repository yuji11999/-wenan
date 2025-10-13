<template>
  <div class="revise-page">
    <h1 class="page-title">🔧 文案改写</h1>
    <p class="page-desc">将现有文案改写为新版本，自动记录改写来源</p>

    <!-- 功能开发中提示 -->
    <div class="dev-notice">
      <el-alert
        title="功能开发中"
        type="info"
        description="文案改写功能正在开发中，敬请期待！"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 文案改写页面
</script>

<style scoped>
.revise-page {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.page-desc {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.dev-notice {
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .page-desc {
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
}
</style>





