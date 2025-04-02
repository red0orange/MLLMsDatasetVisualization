// 全局变量
let allData = [];
let filteredData = [];
let metaData = {};
let currentPage = 1;
const itemsPerPage = 8;
let isLoading = false; // 加载状态标志

// 收藏夹相关
let favorites = {}; // 存储所有收藏夹
let currentFavoriteId = null; // 当前选中的收藏夹ID
let isViewingFavorites = false; // 是否正在查看收藏内容

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 绑定加载本地文件按钮事件
    document.getElementById('loadLocalFile').addEventListener('click', handleLoadLocalFile);

    // 绑定筛选按钮事件
    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    // 添加滚动事件监听
    window.addEventListener('scroll', handleScroll);
    
    // 收藏夹相关事件
    document.getElementById('createFavoriteBtn').addEventListener('click', createFavorite);
    document.getElementById('currentFavorite').addEventListener('change', switchFavorite);
    document.getElementById('deleteFavoriteBtn').addEventListener('click', deleteFavorite);
    document.getElementById('exportFavoriteBtn').addEventListener('click', exportFavorite);
    document.getElementById('viewFavoritesBtn').addEventListener('click', toggleFavoritesView);
    
    // 加载本地存储的收藏夹
    loadFavoritesFromStorage();
});

// 加载本地存储的收藏夹
function loadFavoritesFromStorage() {
    const storedFavorites = localStorage.getItem('vqa_favorites');
    
    if (storedFavorites) {
        try {
            favorites = JSON.parse(storedFavorites);
            updateFavoritesDropdown();
        } catch (e) {
            console.error('加载收藏夹出错:', e);
            favorites = {};
        }
    }
}

// 更新收藏夹下拉菜单
function updateFavoritesDropdown() {
    const dropdown = document.getElementById('currentFavorite');
    
    // 保存当前选中项
    const currentSelected = dropdown.value;
    
    // 清空下拉菜单
    dropdown.innerHTML = '<option value="" disabled selected>请选择收藏夹</option>';
    
    // 添加收藏夹选项
    for (const id in favorites) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = favorites[id].name;
        dropdown.appendChild(option);
    }
    
    // 恢复选中状态
    if (currentSelected && dropdown.querySelector(`option[value="${currentSelected}"]`)) {
        dropdown.value = currentSelected;
    } else if (Object.keys(favorites).length > 0) {
        // 如果没有之前选择的项，但有收藏夹，选择第一个
        dropdown.value = Object.keys(favorites)[0];
    }
    
    // 更新按钮状态
    updateFavoriteButtons();
}

// 更新收藏夹相关按钮状态
function updateFavoriteButtons() {
    const hasSelection = document.getElementById('currentFavorite').value !== "";
    document.getElementById('deleteFavoriteBtn').disabled = !hasSelection;
    document.getElementById('exportFavoriteBtn').disabled = !hasSelection;
    
    if (hasSelection) {
        currentFavoriteId = document.getElementById('currentFavorite').value;
        const count = Object.keys(favorites[currentFavoriteId].items || {}).length;
        document.getElementById('favoriteCount').textContent = count;
        document.getElementById('viewFavoritesBtn').disabled = count === 0;
    } else {
        currentFavoriteId = null;
        document.getElementById('favoriteCount').textContent = "0";
        document.getElementById('viewFavoritesBtn').disabled = true;
    }
}

// 创建新收藏夹
function createFavorite() {
    const name = document.getElementById('favoriteName').value.trim();
    const description = document.getElementById('favoriteDesc').value.trim();
    
    if (!name) {
        showAlert('请输入收藏夹名称', 'warning');
        return;
    }
    
    // 生成唯一ID
    const id = 'fav_' + Date.now();
    
    // 创建新收藏夹
    favorites[id] = {
        id: id,
        name: name,
        description: description,
        createdAt: new Date().toISOString(),
        items: {}
    };
    
    // 保存到本地存储
    saveFavoritesToStorage();
    
    // 更新下拉菜单
    updateFavoritesDropdown();
    
    // 选择新创建的收藏夹
    document.getElementById('currentFavorite').value = id;
    currentFavoriteId = id;
    
    // 更新按钮状态
    updateFavoriteButtons();
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('newFavoriteModal'));
    modal.hide();
    
    // 清空输入框
    document.getElementById('favoriteName').value = '';
    document.getElementById('favoriteDesc').value = '';
    
    showAlert('收藏夹创建成功', 'success');
}

// 切换收藏夹
function switchFavorite() {
    currentFavoriteId = document.getElementById('currentFavorite').value;
    updateFavoriteButtons();
    
    // 更新所有卡片的收藏状态
    if (!isViewingFavorites) {
        updateAllCardsFavoriteStatus();
    }
    
    // 如果当前正在查看收藏内容，则刷新显示
    if (isViewingFavorites) {
        showFavoriteItems();
    }
}

// 更新所有卡片的收藏按钮状态
function updateAllCardsFavoriteStatus() {
    // 获取所有收藏按钮
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    
    favoriteButtons.forEach(btn => {
        // 从卡片中获取pid
        const card = btn.closest('.vqa-card');
        const headerText = card.querySelector('.card-header').textContent;
        const pidMatch = headerText.match(/ID:\s*(\d+)/);
        
        if (pidMatch && pidMatch[1]) {
            const pid = pidMatch[1];
            const isFavorited = isItemFavorited(pid);
            
            // 更新按钮状态
            if (isFavorited) {
                btn.innerHTML = '<i class="bi bi-star-fill"></i>';
                btn.title = '从收藏夹移除';
                btn.classList.add('favorited');
            } else {
                btn.innerHTML = '<i class="bi bi-star"></i>';
                btn.title = '添加到收藏夹';
                btn.classList.remove('favorited');
            }
        }
    });
}

// 删除收藏夹
function deleteFavorite() {
    if (!currentFavoriteId) return;
    
    if (confirm(`确定要删除收藏夹 "${favorites[currentFavoriteId].name}" 吗？此操作不可撤销。`)) {
        delete favorites[currentFavoriteId];
        saveFavoritesToStorage();
        
        // 更新UI
        updateFavoritesDropdown();
        
        // 如果正在查看收藏内容，则切回正常视图
        if (isViewingFavorites) {
            isViewingFavorites = false;
            renderData();
        }
        
        showAlert('收藏夹已删除', 'info');
    }
}

// 导出收藏夹
function exportFavorite() {
    if (!currentFavoriteId) return;
    
    const favorite = favorites[currentFavoriteId];
    
    // 获取收藏夹中的所有项
    const items = Object.values(favorite.items);
    
    if (items.length === 0) {
        showAlert('收藏夹为空，无法导出', 'warning');
        return;
    }
    
    // 创建JSON文件
    const json = JSON.stringify(items, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = `${favorite.name}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
    
    showAlert('收藏夹已导出', 'success');
}

// 切换收藏内容视图
function toggleFavoritesView() {
    isViewingFavorites = !isViewingFavorites;
    
    if (isViewingFavorites) {
        // 切换到收藏视图
        document.getElementById('viewFavoritesBtn').textContent = '返回全部数据';
        document.getElementById('viewFavoritesBtn').classList.replace('btn-outline-primary', 'btn-outline-secondary');
        showFavoriteItems();
    } else {
        // 切换到全部数据视图
        document.getElementById('viewFavoritesBtn').textContent = '查看收藏内容';
        document.getElementById('viewFavoritesBtn').classList.replace('btn-outline-secondary', 'btn-outline-primary');
        currentPage = 1;
        renderData();
    }
}

// 显示收藏夹中的内容
function showFavoriteItems() {
    if (!currentFavoriteId) return;
    
    const container = document.getElementById('dataContainer');
    container.innerHTML = '';
    
    const favoriteItems = Object.values(favorites[currentFavoriteId].items);
    
    if (favoriteItems.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">收藏夹为空</div></div>';
        return;
    }
    
    // 渲染收藏项
    renderDataItems(favoriteItems, container);
}

// 将数据项添加到收藏夹
function addToFavorite(item) {
    if (!currentFavoriteId) {
        showAlert('请先选择或创建收藏夹', 'warning');
        return;
    }
    
    // 复制一个干净的数据项对象
    const itemToSave = { ...item };
    
    // 使用pid作为唯一标识符
    const itemId = itemToSave.pid.toString();
    
    // 检查是否已收藏
    if (favorites[currentFavoriteId].items[itemId]) {
        showAlert('该项已在收藏夹中', 'info');
        return;
    }
    
    // 添加到收藏夹
    favorites[currentFavoriteId].items[itemId] = itemToSave;
    
    // 保存到本地存储
    saveFavoritesToStorage();
    
    // 更新计数
    const count = Object.keys(favorites[currentFavoriteId].items).length;
    document.getElementById('favoriteCount').textContent = count;
    document.getElementById('viewFavoritesBtn').disabled = count === 0;
    
    showAlert('已添加到收藏夹', 'success');
}

// 从收藏夹中移除
function removeFromFavorite(item) {
    if (!currentFavoriteId) return;
    
    const itemId = item.pid.toString();
    
    if (favorites[currentFavoriteId].items[itemId]) {
        delete favorites[currentFavoriteId].items[itemId];
        
        // 保存到本地存储
        saveFavoritesToStorage();
        
        // 更新计数
        const count = Object.keys(favorites[currentFavoriteId].items).length;
        document.getElementById('favoriteCount').textContent = count;
        document.getElementById('viewFavoritesBtn').disabled = count === 0;
        
        // 如果在收藏视图，则刷新显示
        if (isViewingFavorites) {
            showFavoriteItems();
        }
        
        showAlert('已从收藏夹中移除', 'info');
    }
}

// 检查项目是否已收藏
function isItemFavorited(itemId) {
    if (!currentFavoriteId) return false;
    return !!favorites[currentFavoriteId].items[itemId];
}

// 保存收藏夹到本地存储
function saveFavoritesToStorage() {
    localStorage.setItem('vqa_favorites', JSON.stringify(favorites));
}

// 处理滚动事件
function handleScroll() {
    // 如果正在加载、没有更多数据，或者正在查看收藏内容，则返回
    if (isLoading || currentPage * itemsPerPage >= filteredData.length || isViewingFavorites) {
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
        
        // 收藏按钮
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'btn btn-sm favorite-btn';
        
        // 根据是否已收藏设置按钮样式
        const isFavorited = isItemFavorited(item.pid.toString());
        if (isFavorited) {
            favoriteBtn.innerHTML = '<i class="bi bi-star-fill"></i>';
            favoriteBtn.title = '从收藏夹移除';
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.innerHTML = '<i class="bi bi-star"></i>';
            favoriteBtn.title = '添加到收藏夹';
        }
        
        // 绑定收藏/取消收藏事件
        favoriteBtn.onclick = function() {
            if (isItemFavorited(item.pid.toString())) {
                removeFromFavorite(item);
                // 只有在非收藏视图中才更新按钮
                if (!isViewingFavorites) {
                    favoriteBtn.innerHTML = '<i class="bi bi-star"></i>';
                    favoriteBtn.title = '添加到收藏夹';
                    favoriteBtn.classList.remove('favorited');
                }
            } else {
                addToFavorite(item);
                favoriteBtn.innerHTML = '<i class="bi bi-star-fill"></i>';
                favoriteBtn.title = '从收藏夹移除';
                favoriteBtn.classList.add('favorited');
            }
        };
        
        // 将收藏按钮添加到卡片头部
        cardHeader.appendChild(favoriteBtn);
        
        // 卡片内容
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // 图片部分 - 处理图像可能是列表的情况
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        // 确定图像是列表还是单个字符串
        const images = Array.isArray(item.image) ? item.image : [item.image];
        
        // 如果有多个图像，创建图像网格布局
        if (images.length > 1) {
            // 创建图像网格容器
            const imageGrid = document.createElement('div');
            imageGrid.className = 'image-grid';
            
            // 根据图像数量设置网格布局
            if (images.length === 2) {
                imageGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            } else if (images.length === 3) {
                imageGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            } else if (images.length === 4) {
                imageGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
                imageGrid.style.gridTemplateRows = 'repeat(2, 1fr)';
            } else if (images.length <= 6) {
                imageGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                imageGrid.style.gridTemplateRows = 'repeat(2, 1fr)';
            } else {
                imageGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
            
            // 添加所有图像到网格中
            images.forEach((imgSrc, index) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'image-wrapper';
                
                const img = document.createElement('img');
                img.src = imgSrc;
                img.className = 'vqa-image grid-image';
                img.alt = `Image ${item.pid}-${index+1}`;
                
                // 添加点击事件以便查看大图
                img.onclick = function() {
                    openImageModal(imgSrc, `图像 ${index+1}/${images.length}`);
                };
                
                imgWrapper.appendChild(img);
                imageGrid.appendChild(imgWrapper);
            });
            
            // 添加到图像容器
            imageContainer.appendChild(imageGrid);
            
            // 为第一张图像添加打开文件夹按钮
            const openFolderBtn = document.createElement('button');
            openFolderBtn.className = 'btn btn-sm btn-light image-open-btn';
            openFolderBtn.innerHTML = '<i class="bi bi-folder2-open"></i>';
            openFolderBtn.title = '打开图片目录';
            openFolderBtn.onclick = () => openImageFolder(images[0]);
            imageContainer.appendChild(openFolderBtn);
        } else {
            // 单图像情况保持不变
            const img = document.createElement('img');
            img.className = 'vqa-image';
            img.src = images[0];
            img.alt = `Image ${item.pid}`;
            
            // 添加点击事件以便查看大图
            img.onclick = function() {
                openImageModal(images[0], `图像`);
            };
            
            const openFolderBtn = document.createElement('button');
            openFolderBtn.className = 'btn btn-sm btn-light image-open-btn';
            openFolderBtn.innerHTML = '<i class="bi bi-folder2-open"></i>';
            openFolderBtn.title = '打开图片目录';
            openFolderBtn.onclick = () => openImageFolder(images[0]);
            
            imageContainer.appendChild(img);
            imageContainer.appendChild(openFolderBtn);
        }
        
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
    if (!isViewingFavorites && currentPage * itemsPerPage >= filteredData.length && filteredData.length > itemsPerPage) {
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

// 添加图像模态框显示函数
function openImageModal(imgSrc, title) {
    // 检查是否已存在模态框，如果不存在则创建
    let modal = document.getElementById('imageModal');
    
    if (!modal) {
        // 创建模态框结构
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'imageModal';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-labelledby', 'imageModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="imageModalLabel"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img id="modalImage" class="img-fluid" alt="Large Image">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // 设置模态框内容
    document.getElementById('imageModalLabel').textContent = title;
    document.getElementById('modalImage').src = imgSrc;
    
    // 显示模态框
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
} 