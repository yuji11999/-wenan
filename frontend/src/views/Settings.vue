<template>
  <div class="settings-page">
    <h1 class="page-title">⚙️ 系统设置</h1>

    <div class="settings-layout">
      <!-- 左侧菜单 -->
      <div class="settings-menu">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="settings-menu-item"
          :class="{ active: activeMenu === item.key }"
          @click="activeMenu = item.key"
        >
          {{ item.icon }} {{ item.label }}
          <span v-if="item.key === 'users' && pendingUserCount > 0" class="badge">
            {{ pendingUserCount }}
          </span>
          <span v-if="item.key === 'materials' && pendingShareCount > 0" class="badge">
            {{ pendingShareCount }}
          </span>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="settings-content">
        <!-- AI配置 -->
        <div v-show="activeMenu === 'ai'" class="settings-section">
          <div class="ai-config-layout">
            <!-- 左侧：配置表单 -->
            <div class="ai-config-form">
              <h2>AI 配置</h2>
              <div class="input-group">
                <label class="input-label">AI 服务商</label>
                <el-select
                  v-model="aiConfig.provider"
                  placeholder="选择AI服务商"
                  @change="onProviderChange"
                >
                  <el-option label="OpenAI (GPT)" value="openai" />
                  <el-option label="阿里通义千问" value="qwen" />
                  <el-option label="百度文心一言" value="wenxin" />
                  <el-option label="智谱 AI (GLM)" value="zhipu" />
                  <el-option label="DeepSeek" value="deepseek" />
                  <el-option label="Google Gemini" value="gemini" />
                </el-select>
              </div>

              <div class="input-group">
                <label class="input-label">模型</label>
                <el-button size="small" @click="fetchModels" style="margin-left: 8px">刷新列表</el-button>
                <el-select v-model="aiConfig.model" placeholder="选择模型" @change="onModelChange">
                  <el-option
                    v-for="model in availableModels"
                    :key="model.value"
                    :label="model.label"
                    :value="model.value"
                  />
                </el-select>
              </div>

              <div class="input-group">
                <label class="input-label">API Key</label>
                <el-input
                  v-model="aiConfig.apiKey"
                  type="password"
                  placeholder="输入API Key"
                  show-password
  @input="onDraftChange('apiKey', aiConfig.apiKey)"
                />
              </div>

              <div class="input-group">
                <label class="input-label">API 地址</label>
                <el-input
                  v-model="aiConfig.baseUrl"
                  placeholder="默认填入官方最新地址（可修改）"
  @input="onDraftChange('baseUrl', aiConfig.baseUrl)"
                />
              </div>

              <div style="display:flex; gap:8px; align-items:center;">
                <el-button type="primary" @click="saveAiConfig">保存配置</el-button>
                <el-button @click="testConnection">测试连接</el-button>
                <el-button @click="testAllConfigs">一键测试已保存</el-button>
              </div>
            </div>

            <!-- 右侧：当前生效配置（只展示选中的一项） -->
            <div class="ai-models-list">
              <h3>已连接</h3>
              <div v-if="aiStore.testedConnections.length > 0" class="tested-list">
                <div
                  class="model-card selectable"
                  :class="{ active: aiStore.currentConfig && aiStore.currentConfig.provider === conn.provider }"
                  v-for="conn in aiStore.testedConnections"
                  :key="conn.provider"
                  @click="useTestedConnection(conn)"
                >
                  <div class="model-name">{{ conn.providerName }}</div>
                  <div class="model-desc">{{ conn.modelName || conn.model }}</div>
                </div>
              </div>
              <div v-else class="no-models">
                <el-empty description="暂无成功连接记录" :image-size="80" />
              </div>
            </div>
          </div>
        </div>

        <!-- 提示词管理 -->
        <div v-show="activeMenu === 'prompts'" class="settings-section">
          <div class="section-header">
          <h2>提示词管理</h2>
            <el-button type="primary" size="default" @click="savePrompts">
              💾 保存所有提示词
            </el-button>
          </div>

          <el-alert
            title="💡 使用说明"
            type="success"
            :closable="false"
            style="margin-bottom: 1.5rem"
          >
            <p>✏️ <strong>只需修改白色输入框中的中文描述</strong>，用你自己的话告诉AI你想要什么。</p>
            <p>🔒 <strong>灰色区域是系统格式要求</strong>，会自动添加，无需修改。</p>
          </el-alert>

          <!-- 使用折叠面板组织各个提示词板块 -->
          <el-collapse v-model="activePromptPanels" class="prompts-collapse">
            
            <!-- 系统提示词 -->
            <el-collapse-item name="system" class="prompt-panel system-panel">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">🌐</span>
                  <div class="panel-info">
                    <span class="panel-name">系统提示词</span>
                    <span class="panel-desc">定义AI的基础角色和行为（可选）</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
            <el-input
              v-model="userPrompts.system"
              type="textarea"
                  :rows="3"
                  placeholder="例如：你是短视频文案分析与创作专家，擅长从用户视角分析内容..."
                  class="prompt-input"
            />
                <div class="prompt-hint">
                  <span class="hint-icon">💡</span>
                  <span>留空则使用默认角色设定。建议简洁明确地描述AI应该扮演什么角色。</span>
          </div>
              </div>
            </el-collapse-item>

            <!-- 文案拆解 -->
            <el-collapse-item name="deconstruct" class="prompt-panel deconstruct-panel">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">📊</span>
                  <div class="panel-info">
                    <span class="panel-name">文案拆解</span>
                    <span class="panel-desc">分析文案的结构和关键要素</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI分析什么？</div>
            <el-input
              v-model="userPrompts.deconstructDesc"
              type="textarea"
                  :rows="4"
                  placeholder="例如：请帮我分析这段文案的核心话题、开头钩子、金句亮点、广告植入方式等关键要素。"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
              </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">文案内容：</span>
                      <code v-pre>{{content}}</code>
            </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { topic, hook, goldenSentence, adPlacement, content, tags }</code>
          </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <!-- 爆款分析 -->
            <el-collapse-item name="analyze" class="prompt-panel analyze-panel">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">🔥</span>
                  <div class="panel-info">
                    <span class="panel-name">爆款分析</span>
                    <span class="panel-desc">分析文案为何会火及改进建议</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI分析什么？</div>
            <el-input
              v-model="userPrompts.analyzeDesc"
              type="textarea"
                  :rows="4"
                  placeholder="例如：请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及给出改进建议。"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
              </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">文案内容：</span>
                      <code v-pre>{{content}}</code>
            </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { topic, hook, goldenSentence, adPlacement, fireReasons, suggestions, scores }</code>
          </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <!-- 文案仿写 - 结构仿写 -->
            <el-collapse-item name="rewriteStructure" class="prompt-panel rewrite-panel">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">🏗️</span>
                  <div class="panel-info">
                    <span class="panel-name">结构仿写</span>
                    <span class="panel-desc">保持原文案结构，替换内容</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI怎么做？</div>
            <el-input
                  v-model="userPrompts.rewriteStructure"
              type="textarea"
                  :rows="4"
                  placeholder="例如：请严格保持参考文案的段落结构、句式长度和节奏，只替换核心内容和细节描述。"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
              </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">参考文案：</span>
                      <code v-pre>{{reference}}</code>
            </div>
                    <div class="format-item">
                      <span class="format-label">新内容：</span>
                      <code v-pre>{{newContent}}</code>
          </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { title, content, highlights }</code>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <!-- 文案仿写 - 风格仿写 -->
            <el-collapse-item name="rewriteStyle" class="prompt-panel rewrite-panel-2">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">🎨</span>
                  <div class="panel-info">
                    <span class="panel-name">风格仿写</span>
                    <span class="panel-desc">保持原文案风格和语气</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI怎么做？</div>
                <el-input
                  v-model="userPrompts.rewriteStyle"
                  type="textarea"
                  :rows="4"
                  placeholder="例如：请学习参考文案的语气、用词风格、表达方式和情绪基调，用新内容创作一个风格相同的文案。"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
                  </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">参考文案：</span>
                      <code v-pre>{{reference}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">新内容：</span>
                      <code v-pre>{{newContent}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { title, content, highlights }</code>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <!-- 文案仿写 - 钩子仿写 -->
            <el-collapse-item name="rewriteHook" class="prompt-panel rewrite-panel-3">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">🪝</span>
                  <div class="panel-info">
                    <span class="panel-name">钩子仿写</span>
                    <span class="panel-desc">保留钩子方式，更换内容</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI怎么做？</div>
                <el-input
                  v-model="userPrompts.rewriteHook"
                  type="textarea"
                  :rows="4"
                  placeholder="例如：请重点学习参考文案的开头钩子设计和吸引用户的方式，用新内容创作一个同样吸引人的文案。"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
                  </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">参考文案：</span>
                      <code v-pre>{{reference}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">新内容：</span>
                      <code v-pre>{{newContent}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { title, content, highlights }</code>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <!-- 文案仿写 - 混合仿写 -->
            <el-collapse-item name="rewriteMixed" class="prompt-panel rewrite-panel-4">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">🎭</span>
                  <div class="panel-info">
                    <span class="panel-name">混合仿写</span>
                    <span class="panel-desc">自定义保留和替换的部分</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI怎么做？</div>
                <el-input
                  v-model="userPrompts.rewriteMixed"
                  type="textarea"
                  :rows="4"
                  placeholder="例如：请综合考虑参考文案的结构、风格和钩子，灵活组合创作，在保持核心吸引力的同时融入新内容。"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
                  </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">参考文案：</span>
                      <code v-pre>{{reference}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">新内容：</span>
                      <code v-pre>{{newContent}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { title, content, highlights }</code>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <!-- 文案优化 -->
            <el-collapse-item name="optimize" class="prompt-panel optimize-panel">
              <template #title>
                <div class="panel-title">
                  <span class="panel-icon">✨</span>
                  <div class="panel-info">
                    <span class="panel-name">文案优化</span>
                    <span class="panel-desc">优化文案的吸引力和传播力</span>
                  </div>
                </div>
              </template>
              <div class="panel-content">
                <div class="input-label">你希望AI如何优化文案？</div>
                <el-input
                  v-model="userPrompts.optimize"
                  type="textarea"
                  :rows="5"
                  placeholder="例如：请对以下文案进行优化，提升其吸引力、可读性和传播潜力。优化时请关注：1. 开头钩子是否足够吸引人 2. 语言表达是否简洁有力 3. 情感共鸣是否强烈 4. 行动号召是否明确"
                  class="prompt-input"
                />
                <div class="system-format-box">
                  <div class="format-header">
                    <span class="lock-icon">🔒</span>
                    <span>系统格式要求（自动添加）</span>
                  </div>
                  <div class="format-content">
                    <div class="format-item">
                      <span class="format-label">原文案：</span>
                      <code v-pre>{{content}}</code>
                    </div>
                    <div class="format-item">
                      <span class="format-label">输出格式：</span>
                      <code>JSON { optimizedContent, improvements, highlights }</code>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

          </el-collapse>

          <div style="margin-top: 1.5rem; text-align: center;">
            <el-button type="primary" size="large" @click="savePrompts" style="min-width: 200px">
              💾 保存所有提示词
          </el-button>
          </div>
        </div>

        <!-- 分类设置 -->
        <div v-show="activeMenu === 'categories'" class="settings-section">
          <div class="section-header">
            <h2>行业分类设置</h2>
            <el-button type="primary" @click="showAddCategoryDialog">
              <span style="margin-right: 4px">➕</span> 添加分类
            </el-button>
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            管理文案的行业分类，用于文案筛选和分类统计
          </p>

          <el-table :data="categories" v-loading="categoriesLoading" stripe>
            <el-table-column prop="name" label="分类名称" width="200" />
            <el-table-column prop="value" label="分类值" width="200" />
            <el-table-column prop="sortOrder" label="排序" width="100" />
            <el-table-column label="默认分类" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.isDefault" type="info">默认</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="showEditCategoryDialog(row)"
                >
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  :disabled="row.isDefault"
                  @click="handleDeleteCategory(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 用户管理 -->
        <div v-show="activeMenu === 'users'" class="settings-section">
          <div class="section-header">
            <h2>用户管理</h2>
            <div class="header-actions">
              <el-radio-group v-model="userFilter" size="default" @change="loadUsers">
                <el-radio-button label="pending">待审核 ({{ pendingUserCount }})</el-radio-button>
                <el-radio-button label="approved">已审核</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">管理系统用户的审核和状态</p>

          <el-table :data="filteredUsers" v-loading="usersLoading" stripe>
            <el-table-column prop="username" label="用户名" width="180" />

            <el-table-column prop="role" label="角色" width="120">
              <template #default="{ row }">
                <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
                  {{ row.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="createdAt" label="注册时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="300">
              <template #default="{ row }">
                <el-button-group>
                  <el-button
                    v-if="row.status === 'pending'"
                    type="success"
                    size="small"
                    @click="updateUserStatus(row.id, 'approved')"
                  >
                    通过
                  </el-button>

                  <el-button
                    v-if="row.status === 'pending'"
                    type="danger"
                    size="small"
                    @click="updateUserStatus(row.id, 'rejected')"
                  >
                    拒绝
                  </el-button>

                  <el-button
                    v-if="row.status === 'approved'"
                    type="warning"
                    size="small"
                    @click="updateUserStatus(row.id, 'disabled')"
                  >
                    禁用
                  </el-button>

                  <el-button
                    v-if="row.status === 'disabled'"
                    type="success"
                    size="small"
                    @click="updateUserStatus(row.id, 'approved')"
                  >
                    启用
                  </el-button>

                  <el-button
                    v-if="row.status === 'rejected'"
                    type="success"
                    size="small"
                    @click="updateUserStatus(row.id, 'approved')"
                  >
                    通过
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 素材管理 -->
        <div v-show="activeMenu === 'materials'" class="settings-section">
          <div class="section-header">
            <h2>素材管理</h2>
            <div class="header-actions">
              <el-radio-group v-model="materialFilter" size="default" @change="loadMaterials">
                <el-radio-button label="pending">待审核 ({{ pendingShareCount }})</el-radio-button>
                <el-radio-button label="approved">已审核</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            管理用户分享的文案素材，支持审核、编辑和删除
          </p>

          <!-- 批量操作栏 -->
          <div v-if="selectedMaterials.length > 0" class="batch-actions">
            <span class="selection-info">已选择 {{ selectedMaterials.length }} 项</span>
            <div class="batch-buttons">
              <el-button 
                v-if="materialFilter === 'pending'"
                type="success" 
                size="small"
                @click="batchReview('approve')"
              >
                批量通过
              </el-button>
              <el-button 
                v-if="materialFilter === 'pending'"
                type="warning" 
                size="small"
                @click="batchReview('reject')"
              >
                批量拒绝
              </el-button>
              <el-button 
                v-if="materialFilter === 'approved'"
                type="danger" 
                size="small"
                @click="batchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>

          <el-table 
            :data="filteredMaterials" 
            v-loading="materialsLoading" 
            stripe
            @selection-change="handleSelectionChange"
            :row-style="{ height: '60px' }"
            :cell-style="{ padding: '8px 0' }"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column prop="title" label="文案标题" width="200" show-overflow-tooltip />
            
            <el-table-column prop="content" label="内容预览" min-width="300">
              <template #default="{ row }">
                <div class="content-preview-cell">
                  {{ row.content.substring(0, 80) }}{{ row.content.length > 80 ? '...' : '' }}
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="user.username" label="提交用户" width="120" />

            <el-table-column prop="industry" label="行业" width="100" />

            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.shareStatus === 'pending'" type="warning">待审核</el-tag>
                <el-tag v-else-if="row.shareStatus === 'approved'" type="success">已通过</el-tag>
                <el-tag v-else-if="row.shareStatus === 'rejected'" type="danger">已拒绝</el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="updatedAt" label="时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button-group v-if="row.shareStatus === 'pending'">
                  <el-button
                    type="success"
                    size="small"
                    @click="reviewShare(row.id, 'approve')"
                  >
                    通过
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    @click="reviewShare(row.id, 'reject')"
                  >
                    拒绝
                  </el-button>
                  <el-button
                    size="small"
                    @click="previewMaterial(row)"
                  >
                    预览
                  </el-button>
                </el-button-group>
                
                <el-button-group v-else>
                  <el-button
                    size="small"
                    @click="previewMaterial(row)"
                  >
                    查看
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    @click="editMaterial(row)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="deleteMaterial(row.id)"
                  >
                    删除
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 用户数据 -->
        <div v-show="activeMenu === 'userStats'" class="settings-section">
          <div class="section-header">
            <h2>用户数据统计</h2>
            <el-button @click="loadUserStats" :loading="userStatsLoading">
              <span style="margin-right: 4px">🔄</span> 刷新数据
            </el-button>
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            查看每个用户上传素材的数量和创作文案保存的数量
          </p>

          <el-table :data="userStats" v-loading="userStatsLoading" stripe>
            <el-table-column prop="username" label="用户名" width="180" />
            
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="materialCount" label="上传素材数量" width="150" align="center">
              <template #default="{ row }">
                <span style="font-weight: 600; color: var(--primary-color);">
                  {{ row.materialCount }}
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="copywritingCount" label="创作文案数量" width="150" align="center">
              <template #default="{ row }">
                <span style="font-weight: 600; color: #67c23a;">
                  {{ row.copywritingCount }}
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="createdAt" label="注册时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 统计摘要 -->
          <div class="stats-summary">
            <div class="summary-card">
              <div class="summary-label">总用户数</div>
              <div class="summary-value">{{ userStats.length }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">总素材数</div>
              <div class="summary-value">{{ totalMaterials }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">总文案数</div>
              <div class="summary-value">{{ totalCopywritings }}</div>
            </div>
          </div>
        </div>

        <!-- 数据管理 -->
        <div v-show="activeMenu === 'data'" class="settings-section">
          <h2>数据管理</h2>

          <div class="data-actions">
            <el-button type="primary" @click="exportData">导出所有数据</el-button>
            <el-button @click="importData">导入数据</el-button>
            <el-button type="danger" @click="clearData">清空所有数据</el-button>
          </div>

          <el-alert
            title="提示"
            type="warning"
            :closable="false"
            style="margin-top: 1rem"
          >
            清空数据将删除所有文案和分析结果，请谨慎操作！
          </el-alert>
        </div>

        <!-- 关于 -->
        <div v-show="activeMenu === 'about'" class="settings-section">
          <h2>关于系统</h2>

          <div class="about-content">
            <p><strong>系统名称：</strong>短视频文案系统</p>
            <p><strong>版本号：</strong>v1.0.0</p>
            <p><strong>技术栈：</strong>Vue 3 + TypeScript + Element Plus</p>
            <p><strong>描述：</strong>基于AI的短视频文案创作辅助系统</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="categoryDialogMode === 'add' ? '添加分类' : '编辑分类'"
      width="500px"
    >
      <el-form :model="categoryForm" label-width="100px">
        <el-form-item label="分类名称">
          <el-input v-model="categoryForm.name" placeholder="例如：科技互联网" />
        </el-form-item>
        <el-form-item label="分类值">
          <el-input
            v-model="categoryForm.value"
            placeholder="例如：tech（英文，用于系统识别）"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 素材预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="素材详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="previewItem" class="detail-content">
        <div class="detail-header">
          <div class="title-row">
          <h2>{{ previewItem.title || '无标题' }}</h2>
            <el-button 
              v-if="previewItem.videoUrl" 
              type="primary" 
              size="default"
              @click="openVideo(previewItem.videoUrl)"
            >
              🎬 查看视频
            </el-button>
          </div>
          <div class="badges">
            <el-tag v-if="previewItem.shareStatus === 'pending'" type="warning">待审核</el-tag>
            <el-tag v-else-if="previewItem.shareStatus === 'approved'" type="success">已通过</el-tag>
            <el-tag v-else-if="previewItem.shareStatus === 'rejected'" type="danger">已拒绝</el-tag>
            <el-tag>{{ getSourceTypeLabel(previewItem.sourceType) }}</el-tag>
            <el-tag type="warning">{{ categoryStore.getCategoryName(previewItem.industry) }}</el-tag>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>📝 文案内容</h3>
          <div class="content-box">{{ previewItem.content }}</div>
        </div>

        <div v-if="previewItem.analysis" class="detail-section">
          <h3>📊 文案分析</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="核心话题">{{ previewItem.analysis.topic }}</el-descriptions-item>
            <el-descriptions-item label="开头钩子">{{ previewItem.analysis.hook }}</el-descriptions-item>
            <el-descriptions-item label="金句亮点">{{ previewItem.analysis.goldenSentence }}</el-descriptions-item>
            <el-descriptions-item label="广告植入">{{ previewItem.analysis.adPlacement }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-footer">
          <span>提交用户：{{ previewItem.user?.username }}</span>
          <span>申请时间：{{ formatDate(previewItem.updatedAt) }}</span>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
        <el-button 
          v-if="previewItem.shareStatus === 'pending'"
          type="success" 
          @click="reviewShare(previewItem.id, 'approve')"
        >
          通过
        </el-button>
        <el-button 
          v-if="previewItem.shareStatus === 'pending'"
          type="danger" 
          @click="reviewShare(previewItem.id, 'reject')"
        >
          拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑素材对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑素材"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="文案标题">
          <el-input v-model="editForm.title" placeholder="请输入文案标题" />
        </el-form-item>
        
        <el-form-item label="文案内容">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="8"
            placeholder="请输入文案内容..."
          />
        </el-form-item>

        <el-form-item label="行业分类">
          <el-select v-model="editForm.industry" placeholder="选择行业分类">
            <el-option
              v-for="cat in categories"
              :key="cat.value"
              :label="cat.name"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveMaterial">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAIStore, providerConfigs } from '@/stores/ai'
import { useCategoryStore } from '@/stores/category'
import api from '@/api'
import { getPrompts as apiGetPrompts, savePrompts as apiSavePrompts, type PromptsPayload } from '@/api/settings'
import { getAIConfig } from '@/api/ai-config'
import dayjs from 'dayjs'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category
} from '@/api/category'

const route = useRoute()
const userStore = useUserStore()
const aiStore = useAIStore()
const categoryStore = useCategoryStore()

// 从 sessionStorage 恢复上次选中的菜单，如果没有则默认为'ai'
const storedMenu = sessionStorage.getItem('settings_activeMenu') || 'ai'
// 如果是非管理员菜单但用户不是管理员，则重置为'ai'
const activeMenu = ref(
  (storedMenu === 'users' || storedMenu === 'materials') && !userStore.isAdmin 
    ? 'ai' 
    : storedMenu
)

// 初始化
onMounted(async () => {
  try {
    // 如果是从 /users 重定向过来的，自动切换到用户管理标签
    if (route.redirectedFrom?.path === '/users' && userStore.isAdmin) {
      activeMenu.value = 'users'
      sessionStorage.setItem('settings_activeMenu', 'users')
    }

    // 初始化 AI store（从localStorage加载模型列表和草稿、历史测试记录）
    aiStore.initFromStorage()
    aiStore.loadTestedConnections()

    // 从后端加载AI配置
    await aiStore.loadConfigs()

    // 将已保存配置灌入"已连接"列表，便于右侧回显
    aiStore.hydrateTestedConnectionsFromSaved()

    // 加载分类列表
    await loadCategories()

    // 加载提示词
    await loadPrompts()

    // 从已保存的配置初始化表单
    await initAiConfigFromStore()

    // 如果是管理员，预加载待审核数量
    if (userStore.isAdmin) {
      loadUsers()
      loadShareRequests()
      // 如果默认显示用户数据页面，则加载用户数据
      if (activeMenu.value === 'userStats') {
        loadUserStats()
      }
    }
  } catch (error: any) {
    ElMessage.error('加载设置失败，请刷新页面重试')
  }
})

const menuItems = computed(() => {
  const items = [
    { key: 'ai', label: 'AI 配置', icon: '🤖' },
    { key: 'prompts', label: '提示词管理', icon: '📝' },
    { key: 'categories', label: '分类设置', icon: '🏷️' },
    { key: 'data', label: '数据管理', icon: '💾' },
    { key: 'about', label: '关于', icon: 'ℹ️' }
  ]

  // 如果是管理员，添加用户管理、素材管理和用户数据菜单
  if (userStore.isAdmin) {
    items.splice(3, 0, { key: 'users', label: '用户管理', icon: '👥' })
    items.splice(4, 0, { key: 'materials', label: '素材管理', icon: '📋' })
    items.splice(5, 0, { key: 'userStats', label: '用户数据', icon: '📊' })
  }

  return items
})

// AI 配置
interface AIConfig {
  provider: string
  model: string
  apiKey: string
  baseUrl: string
}

const aiConfig = ref<AIConfig>({
  provider: '',
  model: '',
  apiKey: '',
  baseUrl: ''
})

// 可用模型列表
const availableModels = computed(() => {
  // 仅使用刷新后的持久化模型列表；未刷新则为空
  return aiStore.providerModels[aiConfig.value.provider] || []
})

// 模型描述
const modelDescription = computed(() => {
  const models = providerConfigs[aiConfig.value.provider]?.models || []
  const model = models.find(m => m.value === aiConfig.value.model)
  return model?.description || ''
})

// 从当前网关实时拉取模型列表
const fetchModels = async () => {
  const provider = aiConfig.value.provider
  const base = aiConfig.value.baseUrl.replace(/\/$/, '')
  const key = aiConfig.value.apiKey

  // 根据 provider 构建候选，尽量避免无效探测导致控制台 401 噪音
  const candidates: { url: string; headers: Record<string, string> }[] = []
  if (provider === 'gemini') {
    const bearer = key ? { Authorization: `Bearer ${key}` } : {}
    const xgoog = key ? { 'x-goog-api-key': key } : {}
    const root = base.replace(/\/v1$/, '')
    
    // 对于第三方网关（如 hk.12ai.org），优先尝试 Bearer token
    if (base.includes('12ai.org') || base.includes('openai-proxy') || !base.includes('googleapis.com')) {
      candidates.push({ url: `${base}/models`, headers: bearer })
    }
    
    // 官方 Gemini API 风格
    candidates.push({ url: `${root}/v1/models`, headers: xgoog })
    candidates.push({ url: `${root}/v1beta/models`, headers: xgoog })
    if (key) {
      candidates.push({ url: `${root}/v1/models?key=${encodeURIComponent(key)}`, headers: {} })
      candidates.push({ url: `${root}/v1beta/models?key=${encodeURIComponent(key)}`, headers: {} })
    }
  } else {
    const bearer = key ? { Authorization: `Bearer ${key}` } : {}
    const xapi = key ? { 'X-API-Key': key } : {}
    const xapiLower = key ? { 'x-api-key': key } : {}
    const apikey = key ? { 'api-key': key } : {}
    // OpenAI 兼容 + 常见网关 Header 变体
    candidates.push({ url: `${base}/models`, headers: bearer })
    candidates.push({ url: `${base}/models`, headers: xapi })
    candidates.push({ url: `${base}/models`, headers: xapiLower })
    candidates.push({ url: `${base}/models`, headers: apikey })
  }

  let data: any = null
  let lastErr: any = null
  for (const c of candidates) {
    try {
      const resp = await fetch(c.url, { headers: c.headers })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const text = await resp.text()
      // 防止返回 HTML
      if (text.trim().startsWith('<')) throw new Error('非JSON响应（可能是网关错误页）')
      data = JSON.parse(text)
      lastErr = null
      break
    } catch (e) {
      lastErr = e
      continue
    }
  }

  if (lastErr) {
    ElMessage.error(`刷新失败：${lastErr?.message || lastErr}`)
    return
  }

  // 解析不同返回结构
  let items: any[] = []
  if (Array.isArray(data?.data)) {
    // OpenAI 风格
    items = data.data
  } else if (Array.isArray(data)) {
    items = data
  } else if (provider === 'gemini' && Array.isArray(data?.models)) {
    // Gemini 官方风格 { models: [ { name: 'models/gemini-1.5-pro', displayName: '...' } ] }
    items = data.models.map((m: any) => ({ id: (m.name || '').replace(/^models\//, ''), description: m.displayName || '' }))
  }

  if (items.length === 0) {
    ElMessage.warning('网关未返回模型列表或格式不兼容')
    return
  }

  const mapped = items.map((m: any) => ({
    label: m.id || m.name || String(m),
    value: m.id || m.name || String(m),
    description: m.description || ''
  }))

  // 将刷新结果写入 store（持久化）并覆盖运行时的 providerConfigs
  aiStore.saveProviderModels(provider, mapped)
  providerConfigs[provider] = { ...providerConfigs[provider], models: mapped }

  if (!mapped.find(m => m.value === aiConfig.value.model)) {
    aiConfig.value.model = mapped[0]?.value || ''
  }
  ElMessage.success({ message: '模型列表已刷新', duration: 1500 })
}

// API Key 获取链接
const apiKeyLink = computed(() => {
  return providerConfigs[aiConfig.value.provider]?.apiKeyLink || '#'
})

// 从 store 中初始化 AI 配置表单
const initAiConfigFromStore = async () => {
  
  // 如果有当前选中的配置，使用该配置初始化表单
  if (aiStore.currentConfig) {
    aiConfig.value.provider = aiStore.currentConfig.provider
    aiConfig.value.model = aiStore.currentConfig.model
    aiConfig.value.apiKey = aiStore.currentConfig.apiKey
    aiConfig.value.baseUrl = aiStore.currentConfig.baseUrl
    
    // 确保模型选项包含当前模型
    if (!aiStore.providerModels[aiConfig.value.provider]?.length) {
      // 如果没有模型列表，创建一个临时的
      aiStore.providerModels[aiConfig.value.provider] = [{
        label: aiStore.currentConfig.modelName || aiStore.currentConfig.model,
        value: aiStore.currentConfig.model,
        description: ''
      }]
    }
  } else if (aiStore.savedConfigs.length > 0) {
    // 如果没有当前配置但有已保存的配置，使用第一个
    const first = aiStore.savedConfigs[0]
    aiConfig.value.provider = first.provider
    aiConfig.value.model = first.model
    aiConfig.value.baseUrl = first.baseUrl
    
    // 确保模型选项包含当前模型
    if (!aiStore.providerModels[aiConfig.value.provider]?.length) {
      aiStore.providerModels[aiConfig.value.provider] = [{
        label: first.modelName || first.model,
        value: first.model,
        description: ''
      }]
    }
    
    try {
      // 获取完整配置，包括解密的 API Key
      const fullConfig = await getAIConfig(first.id)
      aiConfig.value.apiKey = fullConfig.apiKey || ''
    } catch (error) {
      aiConfig.value.apiKey = ''
    }
  } else {
    // 如果没有任何已保存的配置，使用默认的 OpenAI 配置（但不填写 key）
    aiConfig.value.provider = 'openai'
    aiConfig.value.model = ''
    aiConfig.value.apiKey = ''
    aiConfig.value.baseUrl = ''
  }
}

// 根据 provider 应用该服务商已保存的配置；若没有则清空
const applySavedOrDefault = async () => {
  const provider = aiConfig.value.provider
  if (!provider) return

  const savedList = aiStore.savedConfigs.filter(c => c.provider === provider)
  if (savedList.length === 0) {
    aiConfig.value.apiKey = ''
    aiConfig.value.baseUrl = ''
    aiConfig.value.model = ''
    return
  }

  // 若当前模型在保存记录中，则用该条；否则使用该服务商的第一条保存记录
  const target = savedList.find(c => c.model === aiConfig.value.model) || savedList[0]

  aiConfig.value.model = target.model
  aiConfig.value.baseUrl = target.baseUrl || ''

  try {
    // 精确加载该配置，获取解密后的 apiKey
    const full = await getAIConfig(target.id)
    aiConfig.value.apiKey = full.apiKey || ''
  } catch {
    aiConfig.value.apiKey = ''
  }
}

// 切换服务商：若该服务商有保存过，显示保存值；否则全部为空
const onProviderChange = async () => {
  await applySavedOrDefault()
}

// 切换模型：若该服务商下该模型有保存过则回填；否则清空密钥与地址（模型保留）
const onModelChange = async () => {
  const provider = aiConfig.value.provider
  if (!provider) return
  const saved = aiStore.savedConfigs.find(c => c.provider === provider && c.model === aiConfig.value.model)
  if (saved) {
    aiConfig.value.baseUrl = saved.baseUrl || ''
    try {
      const full = await getAIConfig(saved.id)
      aiConfig.value.apiKey = full.apiKey || ''
    } catch {
      aiConfig.value.apiKey = ''
    }
  } else {
    aiConfig.value.apiKey = ''
    aiConfig.value.baseUrl = ''
  }
}

// 监听输入，实时保存厂商草稿，避免切换模型/刷新列表导致输入丢失
const onDraftChange = (field: 'apiKey' | 'baseUrl', value: string) => {
  const provider = aiConfig.value.provider
  aiStore.setProviderDraft(provider, { [field]: value })
}

const prompts = ref<{ 
  system: string; 
  deconstruct: string; 
  analyze: string; 
  rewriteStructure: string;
  rewriteStyle: string;
  rewriteHook: string;
  rewriteMixed: string;
  optimize: string;
}>({
  system: '',
  deconstruct: '',
  analyze: '',
  rewriteStructure: '',
  rewriteStyle: '',
  rewriteHook: '',
  rewriteMixed: '',
  optimize: ''
})

// 用户可编辑的部分（只包含中文描述）
const userPrompts = ref({
  system: '',
  deconstructDesc: '',
  analyzeDesc: '',
  rewriteStructure: '', // 结构仿写
  rewriteStyle: '',     // 风格仿写
  rewriteHook: '',      // 钩子仿写
  rewriteMixed: '',     // 混合仿写
  optimize: ''          // 文案优化
})

// 控制折叠面板展开状态（默认全部收起）
const activePromptPanels = ref([])

// 系统固定的格式模板（不可修改）
const systemTemplates = {
  deconstruct: '\n\n文案内容：\n{{content}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "topic": "核心话题", "hook": "开头钩子", "goldenSentence": "金句亮点", "adPlacement": "广告植入方式", "content": "核心内容总结", "tags": ["标签1", "标签2"] }',
  analyze: '\n\n文案内容：\n{{content}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "topic": "核心话题", "hook": "开头钩子", "goldenSentence": "金句", "adPlacement": "广告植入", "fireReasons": ["火的原因1", "火的原因2"], "suggestions": ["改进建议1", "建议2"], "scores": {"topicHeat": 85, "hookStrength": 90, "emotionResonance": 88, "spreadPotential": 92, "conversionPower": 87} }',
  rewriteStructure: '\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "title": "文案标题", "content": "完整的仿写内容", "highlights": ["亮点1", "亮点2"] }',
  rewriteStyle: '\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "title": "文案标题", "content": "完整的仿写内容", "highlights": ["亮点1", "亮点2"] }',
  rewriteHook: '\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "title": "文案标题", "content": "完整的仿写内容", "highlights": ["亮点1", "亮点2"] }',
  rewriteMixed: '\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "title": "文案标题", "content": "完整的仿写内容", "highlights": ["亮点1", "亮点2"] }',
  optimize: '\n\n原文案：\n{{content}}\n\n请严格按以下JSON格式返回结果（必需）：\n{ "optimizedContent": "优化后的完整文案", "improvements": ["改进点1", "改进点2", "改进点3"], "highlights": ["亮点1", "亮点2"] }'
}

// 从完整提示词中提取用户描述部分
const extractUserDescription = (fullPrompt: string, systemTemplate: string): string => {
  if (!fullPrompt) return ''
  // 移除系统模板部分，只保留用户描述
  return fullPrompt.replace(systemTemplate, '').trim()
}

const loadPrompts = async () => {
  try {
    const data = await apiGetPrompts()
    // 确保data存在且是对象
    if (data && typeof data === 'object') {
      // 保存完整的提示词（用于高级用户查看）
      prompts.value = {
        system: data.system || '',
        deconstruct: data.deconstruct || '',
        analyze: data.analyze || '',
        rewriteStructure: data.rewriteStructure || '',
        rewriteStyle: data.rewriteStyle || '',
        rewriteHook: data.rewriteHook || '',
        rewriteMixed: data.rewriteMixed || '',
        optimize: data.optimize || ''
      }
      
      // 提取用户可编辑的描述部分
      userPrompts.value = {
        system: data.system || '你是短视频文案分析与创作专家，请严格按JSON格式输出结果。',
        deconstructDesc: extractUserDescription(data.deconstruct || '', systemTemplates.deconstruct) || '请帮我分析这段文案的核心话题、开头钩子、金句亮点、广告植入方式等关键要素。',
        analyzeDesc: extractUserDescription(data.analyze || '', systemTemplates.analyze) || '请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及给出改进建议。',
        rewriteStructure: extractUserDescription(data.rewriteStructure || '', systemTemplates.rewriteStructure) || '请严格保持原文案的段落结构、句式长度和节奏，只替换具体内容，不改变整体框架。',
        rewriteStyle: extractUserDescription(data.rewriteStyle || '', systemTemplates.rewriteStyle) || '请学习原文案的语气、用词风格、表达方式和情绪基调，创作一个风格相似但内容不同的文案。',
        rewriteHook: extractUserDescription(data.rewriteHook || '', systemTemplates.rewriteHook) || '请重点学习原文案开头钩子的设计方式、吸引用户的技巧，用新内容创作同样吸引人的开头。',
        rewriteMixed: extractUserDescription(data.rewriteMixed || '', systemTemplates.rewriteMixed) || '请综合考虑原文案的结构、风格和钩子设计，灵活组合创作一个全新但保持核心优势的文案。',
        optimize: extractUserDescription(data.optimize || '', systemTemplates.optimize) || '请对以下文案进行优化，提升其吸引力、可读性和传播潜力。优化时请关注：1. 开头钩子是否足够吸引人 2. 语言表达是否简洁有力 3. 情感共鸣是否强烈 4. 行动号召是否明确'
      }
    } else {
      // 使用默认值
      userPrompts.value = {
        system: '你是短视频文案分析与创作专家，请严格按JSON格式输出结果。',
        deconstructDesc: '请帮我分析这段文案的核心话题、开头钩子、金句亮点、广告植入方式等关键要素。',
        analyzeDesc: '请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及给出改进建议。',
        rewriteStructure: '请严格保持原文案的段落结构、句式长度和节奏，只替换具体内容，不改变整体框架。',
        rewriteStyle: '请学习原文案的语气、用词风格、表达方式和情绪基调，创作一个风格相似但内容不同的文案。',
        rewriteHook: '请重点学习原文案开头钩子的设计方式、吸引用户的技巧，用新内容创作同样吸引人的开头。',
        rewriteMixed: '请综合考虑原文案的结构、风格和钩子设计，灵活组合创作一个全新但保持核心优势的文案。',
        optimize: '请对以下文案进行优化，提升其吸引力、可读性和传播潜力。优化时请关注：1. 开头钩子是否足够吸引人 2. 语言表达是否简洁有力 3. 情感共鸣是否强烈 4. 行动号召是否明确'
      }
    }
  } catch (e: any) {
    // 发生错误时使用默认值
    userPrompts.value = {
      system: '你是短视频文案分析与创作专家，请严格按JSON格式输出结果。',
      deconstructDesc: '请帮我分析这段文案的核心话题、开头钩子、金句亮点、广告植入方式等关键要素。',
      analyzeDesc: '请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及给出改进建议。',
      rewriteStructure: '请严格保持原文案的段落结构、句式长度和节奏，只替换具体内容，不改变整体框架。',
      rewriteStyle: '请学习原文案的语气、用词风格、表达方式和情绪基调，创作一个风格相似但内容不同的文案。',
      rewriteHook: '请重点学习原文案开头钩子的设计方式、吸引用户的技巧，用新内容创作同样吸引人的开头。',
      rewriteMixed: '请综合考虑原文案的结构、风格和钩子设计，灵活组合创作一个全新但保持核心优势的文案。',
      optimize: '请对以下文案进行优化，提升其吸引力、可读性和传播潜力。优化时请关注：1. 开头钩子是否足够吸引人 2. 语言表达是否简洁有力 3. 情感共鸣是否强烈 4. 行动号召是否明确'
    }
  }
}

// 用户管理相关
interface User {
  id: string
  username: string
  role: string
  status: string
  createdAt: string
}

const allUsers = ref<User[]>([])
const usersLoading = ref(false)
// 从 sessionStorage 恢复用户筛选状态
const userFilter = ref(sessionStorage.getItem('settings_userFilter') || 'pending')

// 用户数据统计相关
interface UserStats {
  id: string
  username: string
  status: string
  createdAt: string
  materialCount: number
  copywritingCount: number
}

const userStats = ref<UserStats[]>([])
const userStatsLoading = ref(false)

// 统计摘要计算
const totalMaterials = computed(() => {
  return userStats.value.reduce((sum, user) => sum + user.materialCount, 0)
})

const totalCopywritings = computed(() => {
  return userStats.value.reduce((sum, user) => sum + user.copywritingCount, 0)
})

// 待审核用户数量
const pendingUserCount = computed(() => {
  return allUsers.value.filter(u => u.status === 'pending').length
})

// 筛选后的用户列表
const users = computed(() => {
  return allUsers.value.filter(u => u.status === 'pending')
})

const filteredUsers = computed(() => {
  if (userFilter.value === 'pending') {
    return allUsers.value.filter(u => u.status === 'pending')
  } else {
    return allUsers.value.filter(u => u.status !== 'pending')
  }
})

// 素材管理相关
const allMaterials = ref<any[]>([])
const materialsLoading = ref(false)
// 从 sessionStorage 恢复素材筛选状态
const materialFilter = ref(sessionStorage.getItem('settings_materialFilter') || 'pending')
const selectedMaterials = ref<any[]>([])
const previewDialogVisible = ref(false)
const previewItem = ref<any>(null)
const editDialogVisible = ref(false)
const saving = ref(false)
const editForm = ref({
  id: '',
  title: '',
  content: '',
  industry: ''
})

// 待审核数量
const pendingShareCount = computed(() => {
  return allMaterials.value.filter(m => m.shareStatus === 'pending').length
})

// 筛选后的素材列表
const shareRequests = computed(() => {
  return allMaterials.value.filter(m => m.shareStatus === 'pending')
})

const filteredMaterials = computed(() => {
  if (materialFilter.value === 'pending') {
    return allMaterials.value.filter(m => m.shareStatus === 'pending')
  } else {
    return allMaterials.value.filter(m => m.shareStatus === 'approved' || m.shareStatus === 'rejected')
  }
})

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    disabled: 'info'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    disabled: '已禁用'
  }
  return texts[status] || status
}

const getSourceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    original: '原创',
    rewrite: '仿写',
    revision: '改写'
  }
  return labels[type] || type
}

// 打开视频链接
const openVideo = (url: string) => {
  if (url) {
    window.open(url, '_blank')
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadUsers = async () => {
  if (!userStore.isAdmin) return

  usersLoading.value = true
  try {
    const response = await api.get('/auth/users')
    allUsers.value = response.data || response
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载用户列表失败')
  } finally {
    usersLoading.value = false
  }
}

const updateUserStatus = async (userId: string, status: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要${getStatusText(status)}该用户吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.put(`/auth/users/${userId}/status`, { status })
    ElMessage.success({ message: '操作成功', duration: 1500 })
    await loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

// 加载素材列表（所有状态）
const loadMaterials = async () => {
  if (!userStore.isAdmin) return

  materialsLoading.value = true
  try {
    const response = await api.get('/copywriting/admin/materials')
    allMaterials.value = response.data || response
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载素材列表失败')
  } finally {
    materialsLoading.value = false
  }
}

// 兼容旧方法名
const loadShareRequests = loadMaterials

// 表格选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedMaterials.value = selection
}

// 审核分享申请
const reviewShare = async (id: string, action: 'approve' | 'reject') => {
  try {
    await ElMessageBox.confirm(
      `确定要${action === 'approve' ? '通过' : '拒绝'}该分享申请吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.put(`/copywriting/admin/share-requests/${id}`, { action })
    ElMessage.success({ message: '操作成功', duration: 1500 })
    
    // 关闭预览对话框
    previewDialogVisible.value = false
    
    // 刷新列表
    await loadMaterials()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

// 批量审核
const batchReview = async (action: 'approve' | 'reject') => {
  if (selectedMaterials.value.length === 0) {
    ElMessage.warning('请先选择要操作的素材')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要${action === 'approve' ? '通过' : '拒绝'}选中的 ${selectedMaterials.value.length} 个素材吗？`,
      '批量操作确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 批量调用审核API
    const promises = selectedMaterials.value.map(item => 
      api.put(`/copywriting/admin/share-requests/${item.id}`, { action })
    )
    
    await Promise.all(promises)
    ElMessage.success({ message: `批量${action === 'approve' ? '通过' : '拒绝'}成功`, duration: 1500 })
    
    // 清空选择并刷新列表
    selectedMaterials.value = []
    await loadMaterials()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '批量操作失败')
    }
  }
}

// 删除素材
const deleteMaterial = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该素材吗？删除后将无法恢复！',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    await api.delete(`/copywriting/${id}`)
    ElMessage.success({ message: '删除成功', duration: 1500 })
    await loadMaterials()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 批量删除
const batchDelete = async () => {
  if (selectedMaterials.value.length === 0) {
    ElMessage.warning('请先选择要删除的素材')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedMaterials.value.length} 个素材吗？删除后将无法恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    const promises = selectedMaterials.value.map(item => 
      api.delete(`/copywriting/${item.id}`)
    )
    
    await Promise.all(promises)
    ElMessage.success({ message: '批量删除成功', duration: 1500 })
    
    selectedMaterials.value = []
    await loadMaterials()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '批量删除失败')
    }
  }
}

// 编辑素材
const editMaterial = (item: any) => {
  editForm.value = {
    id: item.id,
    title: item.title,
    content: item.content,
    industry: item.industry
  }
  editDialogVisible.value = true
}

// 保存编辑
const handleSaveMaterial = async () => {
  if (!editForm.value.title || !editForm.value.content || !editForm.value.industry) {
    ElMessage.warning('请填写完整信息')
    return
  }

  saving.value = true
  try {
    await api.put(`/copywriting/${editForm.value.id}`, {
      title: editForm.value.title,
      content: editForm.value.content,
      industry: editForm.value.industry
    })

    ElMessage.success({ message: '保存成功', duration: 1500 })
    editDialogVisible.value = false
    await loadMaterials()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 预览素材详情
const previewMaterial = (item: any) => {
  previewItem.value = item
  previewDialogVisible.value = true
}

// 加载用户数据统计
const loadUserStats = async () => {
  if (!userStore.isAdmin) return

  userStatsLoading.value = true
  try {
    const response = await api.get('/settings/user-stats')
    userStats.value = response.data || response
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载用户数据统计失败')
  } finally {
    userStatsLoading.value = false
  }
}

// 监听菜单切换，加载对应数据并保存状态
watch(activeMenu, (newMenu) => {
  // 保存当前选中的菜单到 sessionStorage
  sessionStorage.setItem('settings_activeMenu', newMenu)
  
  if (newMenu === 'users' && userStore.isAdmin) {
    loadUsers()
  }
  if (newMenu === 'materials' && userStore.isAdmin) {
    loadMaterials()
  }
  if (newMenu === 'userStats' && userStore.isAdmin) {
    loadUserStats()
  }
})

// 监听用户筛选状态变化，保存到 sessionStorage
watch(userFilter, (newFilter) => {
  sessionStorage.setItem('settings_userFilter', newFilter)
})

// 监听素材筛选状态变化，保存到 sessionStorage
watch(materialFilter, (newFilter) => {
  sessionStorage.setItem('settings_materialFilter', newFilter)
})

const saveAiConfig = async () => {
  // 验证必填项
  if (!aiConfig.value.apiKey) {
    ElMessage.error('请输入 API Key')
    return
  }

  // 获取服务商和模型的显示名称
  const providerConfig = providerConfigs[aiConfig.value.provider]
  const modelConfig = providerConfig?.models.find(m => m.value === aiConfig.value.model)

  try {
    // 保存到 AI store（后端）
    await aiStore.saveConfig({
      provider: aiConfig.value.provider,
      providerName: providerConfig?.name || aiConfig.value.provider,
      model: aiConfig.value.model,
      modelName: modelConfig?.label || aiConfig.value.model,
      apiKey: aiConfig.value.apiKey,
      baseUrl: aiConfig.value.baseUrl
    })

    ElMessage.success({ message: 'AI 配置已保存', duration: 1500 })
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '保存配置失败')
  }
}

// 选择模型
const onModelSelect = () => {
  const config = aiStore.currentConfig
  if (config) {
    ElMessage.success({ message: `已切换到 ${config.providerName} - ${config.modelName}`, duration: 1500 })
    // 同步左侧表单显示为当前配置
    aiConfig.value.provider = config.provider
    aiConfig.value.model = config.model
    aiConfig.value.baseUrl = config.baseUrl
    aiConfig.value.apiKey = config.apiKey || ''
  }
}

// 测试连接：基于当前表单调用 fetchModels，成功则记录到 testedConnections
const testConnection = async () => {
  try {
    await fetchModels()
    const providerConfig = providerConfigs[aiConfig.value.provider]
    const modelConfig = providerConfig?.models.find(m => m.value === aiConfig.value.model)
    aiStore.upsertTestedConnection({
      provider: aiConfig.value.provider,
      providerName: providerConfig?.name || aiConfig.value.provider,
      model: aiConfig.value.model,
      modelName: modelConfig?.label || aiConfig.value.model,
      baseUrl: aiConfig.value.baseUrl
    })
  } catch {
    // 错误已在 fetchModels 内部提示
  }
}

// 静默测试单个配置（复用fetchModels的逻辑但不显示错误消息）
const testSingleConfigSilently = async (provider: string, baseUrl: string, apiKey: string): Promise<boolean> => {
  const base = baseUrl.replace(/\/$/, '')
  const key = apiKey

  // 根据 provider 构建候选，尽量避免无效探测导致控制台 401 噪音
  const candidates: { url: string; headers: Record<string, string> }[] = []
  if (provider === 'gemini') {
    const bearer = key ? { Authorization: `Bearer ${key}` } : {}
    const xgoog = key ? { 'x-goog-api-key': key } : {}
    const root = base.replace(/\/v1$/, '')
    
    // 对于第三方网关（如 hk.12ai.org），优先尝试 Bearer token
    if (baseUrl.includes('12ai.org') || baseUrl.includes('openai-proxy') || !baseUrl.includes('googleapis.com')) {
      candidates.push({ url: `${base}/models`, headers: bearer })
    }
    
    // 官方 Gemini API 风格
    candidates.push({ url: `${root}/v1/models`, headers: xgoog })
    candidates.push({ url: `${root}/v1beta/models`, headers: xgoog })
    if (key) {
      candidates.push({ url: `${root}/v1/models?key=${encodeURIComponent(key)}`, headers: {} })
      candidates.push({ url: `${root}/v1beta/models?key=${encodeURIComponent(key)}`, headers: {} })
    }
  } else {
    const bearer = key ? { Authorization: `Bearer ${key}` } : {}
    const xapi = key ? { 'X-API-Key': key } : {}
    const xapiLower = key ? { 'x-api-key': key } : {}
    const apikey = key ? { 'api-key': key } : {}
    // OpenAI 兼容 + 常见网关 Header 变体
    candidates.push({ url: `${base}/models`, headers: bearer })
    candidates.push({ url: `${base}/models`, headers: xapi })
    candidates.push({ url: `${base}/models`, headers: xapiLower })
    candidates.push({ url: `${base}/models`, headers: apikey })
  }

  for (const c of candidates) {
    try {
      const resp = await fetch(c.url, { headers: c.headers })
      if (!resp.ok) continue
      const text = await resp.text()
      // 防止返回 HTML
      if (text.trim().startsWith('<')) continue
      // 尝试解析JSON，确保是有效响应
      JSON.parse(text)
      return true
    } catch (e) {
      // 静默跳过，不输出错误
      continue
    }
  }
  return false
}

// 保守的单配置测试（只测试最常用的认证方式，减少401错误）
const testSingleConfigConservatively = async (provider: string, baseUrl: string, apiKey: string): Promise<boolean> => {
  const base = baseUrl.replace(/\/$/, '')
  
  try {
    let url = ''
    let headers: Record<string, string> = {}
    
    // 根据服务商选择最常用的认证方式
    if (provider === 'gemini') {
      const root = base.replace(/\/v1$/, '')
      url = `${root}/v1/models`
      headers = { 'x-goog-api-key': apiKey }
    } else {
      // 对于其他服务商，优先使用Bearer认证（最常见）
      url = `${base}/models`
      headers = { 'Authorization': `Bearer ${apiKey}` }
    }

    const resp = await fetch(url, { headers })
    if (!resp.ok) return false
    
    const text = await resp.text()
    // 防止返回 HTML
    if (text.trim().startsWith('<')) return false
    
    // 尝试解析JSON，确保是有效响应
    JSON.parse(text)
    return true
  } catch (e) {
    // 静默处理所有错误
    return false
  }
}

// 一键测试所有已保存的配置
const testAllConfigs = async () => {
  if (aiStore.savedConfigs.length === 0) {
    ElMessage.info('暂无已保存配置可测试')
    return
  }

  // 首先检查已连接的配置，避免重复测试
  const alreadyConnected = aiStore.testedConnections.map(conn => `${conn.provider}-${conn.model}`)
  const configsToTest = aiStore.savedConfigs.filter(cfg => 
    !alreadyConnected.includes(`${cfg.provider}-${cfg.model}`)
  )

  if (configsToTest.length === 0) {
    ElMessage.success({ message: '所有已保存的配置都已连接成功！', duration: 1500 })
    return
  }

  ElMessage.info(`开始测试 ${configsToTest.length} 个未连接的配置...`)
  
  let success = 0
  let skipped = 0
  let failed = 0
  const total = configsToTest.length
  
  for (const cfg of configsToTest) {
    // 获取解密后的 API Key
    let apiKey = ''
    try {
      const full = await getAIConfig(cfg.id)
      apiKey = full.apiKey || ''
    } catch (err) {
      // 无法获取配置详情，跳过
      skipped += 1
      continue
    }

    // 检查配置完整性
    if (!apiKey || !cfg.baseUrl) {
      skipped += 1
      continue
    }

    // 基本URL格式检查，避免明显无效的请求
    if (!cfg.baseUrl.startsWith('http')) {
      skipped += 1
      continue
    }

    try {
      // 使用更保守的测试方法：只测试最可能成功的一种方式
      const isConnected = await testSingleConfigConservatively(cfg.provider, cfg.baseUrl, apiKey)
      
      if (isConnected) {
        // 测试成功，添加到已连接列表
        aiStore.upsertTestedConnection({
          provider: cfg.provider,
          providerName: cfg.providerName,
          model: cfg.model,
          modelName: cfg.modelName,
          baseUrl: cfg.baseUrl
        })
        success += 1
      } else {
        failed += 1
      }
    } catch (e) {
      // 测试过程出错
      failed += 1
    }
  }

  // 显示测试结果
  const totalConnected = aiStore.testedConnections.length
  if (success > 0) {
    ElMessage.success({ message: `测试完成！新增 ${success} 个连接，当前共有 ${totalConnected} 个可用配置`, duration: 2000 })
  } else if (skipped === total) {
    ElMessage.warning('所有配置都被跳过，请检查配置是否完整')
  } else {
    ElMessage.warning(`测试完成，但没有新的成功连接。失败 ${failed} 个，跳过 ${skipped} 个`)
  }
}

// 点击右侧"已连接"卡片，直接使用该配置
const useTestedConnection = async (conn: any) => {
  // 查找对应的已保存配置
  let config = aiStore.savedConfigs.find(c => c.provider === conn.provider && c.model === conn.model)
  
  try {
    // 如果配置不存在，先自动保存
    if (!config) {
      // 从草稿或当前表单获取API Key
      let apiKey = aiStore.providerDrafts[conn.provider]?.apiKey || aiConfig.value.apiKey || ''
      
      // 如果没有API Key，尝试从同服务商的其他配置获取
      if (!apiKey) {
        const sameProviderConfig = aiStore.savedConfigs.find(c => c.provider === conn.provider)
        if (sameProviderConfig) {
          try {
            const full = await getAIConfig(sameProviderConfig.id)
            apiKey = full.apiKey || ''
          } catch (e) {
            // 获取失败，继续使用空key
          }
        }
      }

      // 自动保存配置
      await aiStore.saveConfig({
        provider: conn.provider,
        providerName: conn.providerName,
        model: conn.model,
        modelName: conn.modelName,
        apiKey: apiKey,
        baseUrl: conn.baseUrl,
        isActive: true  // 设置为激活状态
      })
      
      // 重新查找配置
      config = aiStore.savedConfigs.find(c => c.provider === conn.provider && c.model === conn.model)
    } else {
      // 如果配置存在，直接设置为当前配置
      await aiStore.setCurrentConfig(config.id)
    }
    
    // 同步左侧表单显示
    aiConfig.value.provider = conn.provider
    aiConfig.value.model = conn.model
    aiConfig.value.baseUrl = conn.baseUrl
    
    // 获取并显示API Key
    if (config) {
      try {
        const full = await getAIConfig(config.id)
        aiConfig.value.apiKey = full.apiKey || ''
      } catch {
        aiConfig.value.apiKey = ''
      }
    }
    
    ElMessage.success({ message: `✅ 已切换到 ${conn.providerName} - ${conn.modelName || conn.model}`, duration: 1500 })
    
  } catch (error: any) {
    ElMessage.error({
      message: `切换失败：${error.message || '未知错误'}\n\n请检查网络连接或API Key配置`,
      duration: 5000,
      showClose: true
    })
  }
}

// 删除模型
const deleteModel = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个 AI 模型配置吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await aiStore.deleteConfig(id)
    ElMessage.success({ message: '已删除配置', duration: 1500 })
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.message || '删除配置失败')
    }
  }
}

const savePrompts = async () => {
  // 验证必填项
  if (!userPrompts.value.deconstructDesc || !userPrompts.value.analyzeDesc || 
      !userPrompts.value.rewriteStructure || !userPrompts.value.rewriteStyle ||
      !userPrompts.value.rewriteHook || !userPrompts.value.rewriteMixed || !userPrompts.value.optimize) {
    ElMessage.warning('请填写所有必填的提示词描述')
    return
  }
  
  // 组合用户描述 + 系统格式要求
  const payload: PromptsPayload = {
    system: userPrompts.value.system || '你是短视频文案分析与创作专家，请严格按JSON格式输出结果。',
    deconstruct: userPrompts.value.deconstructDesc + systemTemplates.deconstruct,
    analyze: userPrompts.value.analyzeDesc + systemTemplates.analyze,
    rewriteStructure: userPrompts.value.rewriteStructure + systemTemplates.rewriteStructure,
    rewriteStyle: userPrompts.value.rewriteStyle + systemTemplates.rewriteStyle,
    rewriteHook: userPrompts.value.rewriteHook + systemTemplates.rewriteHook,
    rewriteMixed: userPrompts.value.rewriteMixed + systemTemplates.rewriteMixed,
    optimize: userPrompts.value.optimize + systemTemplates.optimize,
  }
  
  try {
    await apiSavePrompts(payload)
    ElMessage.success({ message: '提示词已保存', duration: 1500 })
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '保存提示词失败')
  }
}

// ========== 分类管理 ==========
const categories = ref<Category[]>([])
const categoriesLoading = ref(false)
const categoryDialogVisible = ref(false)
const categoryDialogMode = ref<'add' | 'edit'>('add')
const categoryForm = ref({
  id: '',
  name: '',
  value: '',
  sortOrder: 0
})

// 加载分类列表
const loadCategories = async () => {
  categoriesLoading.value = true
  try {
    const data = await getCategories()
    // 后端直接返回数组，不是 {data: []} 格式
    if (Array.isArray(data)) {
      categories.value = data as Category[]
    } else if (data?.data && Array.isArray(data.data)) {
      // 兼容 {data: []} 格式
      categories.value = data.data as Category[]
    } else {
      categories.value = []
    }
  } catch (error: any) {
    ElMessage.error(error.errorMessage || error.message || '加载分类失败')
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

// 显示添加分类对话框
const showAddCategoryDialog = () => {
  categoryDialogMode.value = 'add'
  categoryForm.value = {
    id: '',
    name: '',
    value: '',
    sortOrder: 0
  }
  categoryDialogVisible.value = true
}

// 显示编辑分类对话框
const showEditCategoryDialog = (category: Category) => {
  categoryDialogMode.value = 'edit'
  categoryForm.value = {
    id: category.id,
    name: category.name,
    value: category.value,
    sortOrder: category.sortOrder
  }
  categoryDialogVisible.value = true
}

// 保存分类
const handleSaveCategory = async () => {
  if (!categoryForm.value.name || !categoryForm.value.value) {
    ElMessage.warning('请填写分类名称和分类值')
    return
  }

  try {
    if (categoryDialogMode.value === 'add') {
      await createCategory({
        name: categoryForm.value.name,
        value: categoryForm.value.value,
        sortOrder: categoryForm.value.sortOrder
      })
      ElMessage.success({ message: '分类添加成功', duration: 1500 })
    } else {
      await updateCategory(categoryForm.value.id, {
        name: categoryForm.value.name,
        value: categoryForm.value.value,
        sortOrder: categoryForm.value.sortOrder
      })
      ElMessage.success({ message: '分类更新成功', duration: 1500 })
    }
    categoryDialogVisible.value = false
    loadCategories()
  } catch (error: any) {
    ElMessage.error(error.errorMessage || '保存分类失败')
  }
}

// 删除分类
const handleDeleteCategory = async (category: Category) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类"${category.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteCategory(category.id)
    ElMessage.success({ message: '分类删除成功', duration: 1500 })
    loadCategories()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.errorMessage || '删除分类失败')
    }
  }
}

const exportData = () => {
  // TODO: 导出数据
  ElMessage.success({ message: '数据导出成功', duration: 1500 })
}

const importData = () => {
  // TODO: 导入数据
  ElMessage.info('请选择要导入的数据文件')
}

const clearData = () => {
  // TODO: 清空数据
  ElMessage.warning('此功能需要确认')
}
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.settings-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
}

.settings-menu {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  height: fit-content;
}

.settings-menu-item {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.25rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-menu-item:hover {
  background: var(--bg-gray);
}

.settings-menu-item.active {
  background: var(--primary-color);
  color: white;
  font-weight: 500;
}

.settings-menu-item .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #f56c6c;
  color: white;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.settings-menu-item.active .badge {
  background: white;
  color: var(--primary-color);
}

.settings-content {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.settings-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
}

.section-header h2 {
  margin-bottom: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.selection-info {
  color: #409eff;
  font-weight: 500;
}

.batch-buttons {
  display: flex;
  gap: 0.5rem;
}

/* 表格内容预览单元格 */
.content-preview-cell {
  max-height: 44px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

/* 折叠面板样式优化 */
.prompts-collapse {
  border: none;
}

.prompts-collapse :deep(.el-collapse-item) {
  margin-bottom: 1rem;
  border: 1px solid #e4e7ed;
  border-radius: 0.5rem;
  overflow: hidden;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.prompts-collapse :deep(.el-collapse-item:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.prompts-collapse :deep(.el-collapse-item__header) {
  background: linear-gradient(to right, #f8f9fa, #ffffff);
  border: none;
  padding: 1rem 1.25rem;
  height: auto;
  line-height: 1.5;
  font-size: 1rem;
}

.prompts-collapse :deep(.el-collapse-item__wrap) {
  border: none;
  background: white;
}

.prompts-collapse :deep(.el-collapse-item__content) {
  padding: 0 1.25rem 1.25rem;
}

/* 面板标题样式 */
.panel-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.panel-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.panel-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.panel-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: normal;
}

/* 不同面板的颜色标识 */
.system-panel :deep(.el-collapse-item__header) {
  border-left: 4px solid #17a2b8;
}

.deconstruct-panel :deep(.el-collapse-item__header) {
  border-left: 4px solid #007bff;
}

.analyze-panel :deep(.el-collapse-item__header) {
  border-left: 4px solid #fd7e14;
}

.rewrite-panel :deep(.el-collapse-item__header) {
  border-left: 4px solid #28a745;  /* 结构仿写 - 绿色 */
}

.rewrite-panel-2 :deep(.el-collapse-item__header) {
  border-left: 4px solid #6f42c1;  /* 风格仿写 - 紫色 */
}

.rewrite-panel-3 :deep(.el-collapse-item__header) {
  border-left: 4px solid #20c997;  /* 钩子仿写 - 青色 */
}

.rewrite-panel-4 :deep(.el-collapse-item__header) {
  border-left: 4px solid #e83e8c;  /* 混合仿写 - 粉色 */
}

/* 面板内容样式 */
.panel-content {
  padding-top: 0.5rem;
}

.input-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.prompt-input {
  margin-bottom: 1rem;
}

.prompt-input :deep(.el-textarea__inner) {
  background: #fafafa;
  border: 2px solid #e9ecef;
  transition: all 0.3s;
  font-size: 0.9375rem;
  line-height: 1.8;
}

.prompt-input :deep(.el-textarea__inner:focus) {
  background: white;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.prompt-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #856404;
  padding: 0.75rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 0.375rem;
  line-height: 1.6;
}

.hint-icon {
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 2px;
}

/* 系统格式要求框 */
.system-format-box {
  margin-top: 1rem;
  background: #f8f9fa;
  border: 1px dashed #d0d0d0;
  border-radius: 0.5rem;
  padding: 1rem;
}

.format-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.75rem;
}

.lock-icon {
  font-size: 1rem;
}

.format-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.format-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.8;
}

.format-label {
  font-weight: 500;
  color: #6c757d;
  white-space: nowrap;
}

.format-item code {
  background: white;
  padding: 2px 8px;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  color: #e83e8c;
  border: 1px solid #f0f0f0;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* 兼容旧样式 */
.prompt-item {
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

.prompt-item h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.prompt-item code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.875rem;
  color: #e83e8c;
  border: 1px solid #f0f0f0;
}

.system-part {
  margin-top: 1rem;
  background: #f5f5f5;
  border: 1px dashed #d0d0d0;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.system-part-header {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.system-part-content {
  font-size: 0.8125rem;
  color: #888;
  line-height: 1.8;
  font-family: 'Consolas', 'Monaco', monospace;
}

.data-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.about-content p {
  margin-bottom: 0.75rem;
  line-height: 1.8;
}

.input-hint {
  font-size: 0.8125rem;
  color: #6c757d;
  margin-top: 0.75rem;
  line-height: 1.6;
  background: #fff;
  padding: 0.75rem;
  border-radius: 0.375rem;
  border-left: 3px solid #17a2b8;
}

.input-hint strong {
  color: #495057;
  font-weight: 600;
}

/* AI 配置布局 */
.ai-config-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
}

.ai-config-form {
  min-width: 0;
}

.ai-models-list {
  height: fit-content;
  position: sticky;
  top: 2rem;
}

.tested-list {
  display: grid;
  gap: 0.875rem;
}

.ai-models-list h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.model-radio-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.model-card {
  background: white;
  border-radius: 0.625rem;
  padding: 1.125rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #e5e7eb;
  position: relative;
  cursor: default;
  min-height: 88px;
}

.model-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}

.model-card.active {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.model-card.selectable {
  cursor: pointer;
}

.model-card.selectable:hover {
  border-color: #409eff;
}

.model-radio {
  display: none;
}

.model-radio :deep(.el-radio__input) {
  line-height: 1;
}

.model-radio :deep(.el-radio__label) {
  padding-left: 0.625rem;
  font-size: 0.9375rem;
  line-height: 1.4;
}

.model-name {
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0.01em;
}

.model-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  padding-left: 1.625rem;
  line-height: 1.5;
  margin-top: -0.125rem;
}

.delete-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  opacity: 1;
}

.model-card:not(:hover) .delete-btn {
  opacity: 0;
}

.model-card.active .delete-btn {
  opacity: 0.8;
}

.no-models {
  text-align: center;
  padding: 2rem 0;
}

.hint-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .settings-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .settings-menu {
    display: flex;
    overflow-x: auto;
    gap: 0.5rem;
    padding: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .settings-menu::-webkit-scrollbar {
    display: none;
  }

  .settings-menu-item {
    white-space: nowrap;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .settings-content {
    padding: 1rem;
  }

  .settings-section h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-radio-group {
    width: 100%;
  }

  .header-actions .el-radio-button {
    flex: 1;
  }

  .ai-config-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .ai-models-list {
    position: static;
  }

  .input-group {
    margin-bottom: 1rem;
  }

  .input-label {
    font-size: 0.8125rem;
  }

  /* 表格优化 */
  .el-table {
    font-size: 0.8125rem;
  }

  .el-table th,
  .el-table td {
    padding: 8px 4px;
  }

  .el-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .el-button-group .el-button {
    margin: 0 !important;
    flex: 1;
    min-width: 60px;
  }

  /* 批量操作栏 */
  .batch-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }

  .batch-buttons {
    width: 100%;
  }

  .batch-buttons button {
    flex: 1;
  }

  /* 对话框 */
  .el-dialog {
    width: 95% !important;
    margin: 5vh auto;
  }

  .detail-header h2 {
    font-size: 1.125rem;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .title-row .el-button {
    width: 100%;
  }

  .detail-section h3 {
    font-size: 1rem;
  }

  .content-box {
    font-size: 0.875rem;
  }

  .prompt-item {
    padding: 1rem;
  }

  .category-form .el-form-item {
    margin-bottom: 1rem;
  }

  /* 提示词面板移动端优化 */
  .prompts-collapse :deep(.el-collapse-item__header) {
    padding: 0.75rem 1rem;
  }

  .panel-icon {
    font-size: 1.5rem;
  }

  .panel-name {
    font-size: 1rem;
  }

  .panel-desc {
    font-size: 0.8125rem;
  }

  .prompts-collapse :deep(.el-collapse-item__content) {
    padding: 0 1rem 1rem;
  }

  .format-item {
    flex-direction: column;
    gap: 0.25rem;
  }

  .format-label {
    font-weight: 600;
  }
}

/* 素材详情对话框样式 */
.detail-content {
  padding: 1rem 0;
}

.detail-header {
  margin-bottom: 1.5rem;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.detail-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.content-box {
  padding: 1rem;
  background: var(--bg-gray);
  border-radius: 0.5rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* 统计摘要卡片 */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid var(--border-color);
}

.summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0.75rem;
  padding: 1.5rem;
  color: white;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.summary-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.summary-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.summary-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: 2rem;
  font-weight: bold;
}
</style>




