// 全局变量
let allData = [];
let filteredData = [];
let metaData = {};
let currentPage = 1;
const itemsPerPage = 8;
let isLoading = false; // 添加加载状态标志

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 绑定加载本地文件按钮事件
    document.getElementById('loadLocalFile').addEventListener('click', handleLoadLocalFile);

    // 绑定筛选按钮事件
    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    // 添加滚动事件监听
    window.addEventListener('scroll', handleScroll);
});

// 处理滚动事件
function handleScroll() {
    // 如果正在加载或者没有更多数据，则返回
    if (isLoading || currentPage * itemsPerPage >= filteredData.length) {
        return;
    }

    // 计算滚动位置
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight;

    // 当滚动到底部附近时，加载更多数据
    if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreData();
    }
}

// 加载更多数据
function loadMoreData() {
    isLoading = true;
    
    // 显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'scrollLoadingIndicator';
    loadingIndicator.className = 'text-center my-3';
    loadingIndicator.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
    document.getElementById('dataContainer').appendChild(loadingIndicator);
    
    // 模拟网络延迟，实际使用时可以删除
    setTimeout(() => {
        currentPage++;
        renderMoreData();
        
        // 移除加载指示器
        const indicator = document.getElementById('scrollLoadingIndicator');
        if (indicator) {
            indicator.remove();
        }
        
        isLoading = false;
    }, 500);
}

// 处理从服务器本地文件加载
async function handleLoadLocalFile() {
    const filePath = document.getElementById('localFilePath').value.trim();
    
    if (!filePath) {
        showAlert('请输入本地文件路径', 'danger');
        return;
    }
    
    // 显示加载中
    showLoading(true);
    
    try {
        // 发送请求
        const response = await fetch(`/api/load_local_file?file_path=${encodeURIComponent(filePath)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '加载文件失败，服务器响应: ' + response.status);
        }
        
        const result = await response.json();
        
        // 保存数据
        allData = result.data;
        filteredData = [...allData];
        metaData = result.meta;
        currentPage = 1; // 重置页码
        
        // 更新UI
        updateFilters();
        updateStats();
        renderData();
        
        // 显示筛选卡片
        document.getElementById('filterCard').style.display = 'block';
        
        // 隐藏提示
        document.getElementById('uploadInfo').style.display = 'none';
        
        showAlert(`成功从本地文件加载 ${allData.length} 条数据`, 'success');
    } catch (error) {
        console.error('加载失败:', error);
        showAlert('加载本地文件时出错: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// 更新筛选器下拉菜单
function updateFilters() {
    // 更新Subject筛选
    const subjectFilter = document.getElementById('subjectFilter');
    subjectFilter.innerHTML = '<option value="all">全部</option>';
    metaData.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
    
    // 更新Category筛选
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="all">全部</option>';
    metaData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // 更新Type筛选
    const typeFilter = document.getElementById('typeFilter');
    typeFilter.innerHTML = '<option value="all">全部</option>';
    metaData.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

// 应用筛选
function applyFilters() {
    const subject = document.getElementById('subjectFilter').value;
    const category = document.getElementById('categoryFilter').value;
    const type = document.getElementById('typeFilter').value;
    
    filteredData = allData.filter(item => {
        // 筛选subject
        if (subject !== 'all' && item.subject !== subject) {
            return false;
        }
        
        // 筛选category
        if (category !== 'all' && item.category !== category) {
            return false;
        }
        
        // 筛选type
        if (type !== 'all' && item.type !== type) {
            return false;
        }
        
        return true;
    });
    
    // 重置到第一页
    currentPage = 1;
    
    // 更新统计和渲染数据
    updateStats();
    renderData();
    
    showAlert(`筛选后显示 ${filteredData.length} 条数据`, 'info');
}

// 更新统计信息
function updateStats() {
    document.getElementById('totalCount').textContent = allData.length;
    document.getElementById('currentCount').textContent = filteredData.length;
}

// 渲染数据（初始加载）
function renderData() {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';
    
    if (filteredData.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">没有符合条件的数据</div></div>';
        return;
    }
    
    // 计算当前页的数据
    const startIndex = 0;
    const endIndex = Math.min(itemsPerPage, filteredData.length);
    const initialData = filteredData.slice(startIndex, endIndex);
    
    // 渲染每条数据
    renderDataItems(initialData, container);
}

// 渲染更多数据（滚动加载）
function renderMoreData() {
    const container = document.getElementById('dataContainer');
    
    // 计算新一页的数据
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const newPageData = filteredData.slice(startIndex, endIndex);
    
    // 渲染数据项
    renderDataItems(newPageData, container);
}

// 渲染数据项（复用函数）
function renderDataItems(dataItems, container) {
    dataItems.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-6 mb-4 fade-in';
        
        const card = document.createElement('div');
        card.className = 'vqa-card';
        
        // 卡片头部
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header bg-info text-white';
        cardHeader.innerHTML = `
            <span>ID: ${item.pid}</span>
            <span>${item.subject} / ${item.category}</span>
        `;
        
        // 卡片内容
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // 图片部分
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        // 加载图片 - 现在图像路径已经在后端处理过
        const img = document.createElement('img');
        img.className = 'vqa-image';
        img.src = item.image;
        img.alt = `Image ${item.pid}`;
        
        const openFolderBtn = document.createElement('button');
        openFolderBtn.className = 'btn btn-sm btn-light image-open-btn';
        openFolderBtn.innerHTML = '<i class="bi bi-folder2-open"></i>';
        openFolderBtn.title = '打开图片目录';
        openFolderBtn.onclick = () => openImageFolder(item.image);
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(openFolderBtn);
        
        // 问题部分
        const questionContainer = document.createElement('div');
        questionContainer.className = 'question-container';
        
        const questionText = document.createElement('p');
        questionText.textContent = item.question;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-sm btn-light copy-btn';
        copyBtn.textContent = '复制';
        copyBtn.onclick = () => copyToClipboard(item.question);
        
        questionContainer.appendChild(questionText);
        questionContainer.appendChild(copyBtn);
        
        // 答案部分
        const answerContainer = document.createElement('div');
        answerContainer.className = 'mt-3';
        answerContainer.innerHTML = `<div class="answer">答案: ${item.answer}</div>`;
        
        // 拼接卡片内容
        cardBody.appendChild(imageContainer);
        cardBody.appendChild(questionContainer);
        cardBody.appendChild(answerContainer);
        
        // 卡片底部
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';
        cardFooter.innerHTML = `
            <div class="d-flex justify-content-between">
                <span class="badge bg-primary">${item.type}</span>
                <span class="text-muted">Source: ${item.source}</span>
            </div>
        `;
        
        // 拼接整个卡片
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        card.appendChild(cardFooter);
        
        // 添加到容器
        col.appendChild(card);
        container.appendChild(col);
    });
    
    // 如果已经加载完所有数据，显示一个提示
    if (currentPage * itemsPerPage >= filteredData.length && filteredData.length > itemsPerPage) {
        const endMessage = document.createElement('div');
        endMessage.className = 'col-12 end-message fade-in';
        endMessage.innerHTML = '<p>— 已加载全部数据 —</p>';
        container.appendChild(endMessage);
    }
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showAlert('问题已复制到剪贴板', 'success', 1500);
        })
        .catch(err => {
            console.error('复制失败:', err);
            showAlert('复制失败', 'danger');
        });
}

// 打开图像所在文件夹
async function openImageFolder(imagePath) {
    try {
        const formData = new FormData();
        formData.append('image_path', imagePath);
        
        const response = await fetch('/api/open_image_folder', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('已打开图像目录', 'success', 1500);
        } else {
            showAlert(result.message || '打开文件夹失败', 'warning');
        }
    } catch (error) {
        console.error('打开文件夹失败:', error);
        showAlert('打开文件夹时出错', 'danger');
    }
}

// 显示或隐藏加载动画
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// 显示提示信息
function showAlert(message, type = 'info', duration = 3000) {
    // 创建提示元素
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.role = 'alert';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // 添加到文档
    document.body.appendChild(alertDiv);
    
    // 设置定时器自动关闭
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, duration);
} 