// 全局变量
let allData = [];
let filteredData = [];
let metaData = {};
let currentPage = 1;
const itemsPerPage = 8;

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 绑定加载本地文件按钮事件
    document.getElementById('loadLocalFile').addEventListener('click', handleLoadLocalFile);

    // 绑定筛选按钮事件
    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    // 绑定分页事件
    document.getElementById('prevPage').addEventListener('click', goToPrevPage);
    document.getElementById('nextPage').addEventListener('click', goToNextPage);
});

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

// 渲染数据
function renderData() {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';
    
    // 计算当前页的数据
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const currentPageData = filteredData.slice(startIndex, endIndex);
    
    if (currentPageData.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">没有符合条件的数据</div></div>';
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    // 渲染每条数据
    currentPageData.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-6 mb-4';
        
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
    
    // 更新分页
    updatePagination();
}

// 更新分页控件
function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    // 如果没有数据或者只有一页，隐藏分页
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'block';
    
    // 更新页码信息
    document.getElementById('pageInfo').textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;
    
    // 更新上一页按钮状态
    const prevBtn = document.getElementById('prevPage');
    if (currentPage === 1) {
        prevBtn.parentElement.classList.add('disabled');
    } else {
        prevBtn.parentElement.classList.remove('disabled');
    }
    
    // 更新下一页按钮状态
    const nextBtn = document.getElementById('nextPage');
    if (currentPage === totalPages) {
        nextBtn.parentElement.classList.add('disabled');
    } else {
        nextBtn.parentElement.classList.remove('disabled');
    }
}

// 上一页
function goToPrevPage(e) {
    e.preventDefault();
    if (currentPage > 1) {
        currentPage--;
        renderData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 下一页
function goToNextPage(e) {
    e.preventDefault();
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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