# VQA 数据可视化工具

这是一个基于FastAPI的Web应用，用于可视化VQA（Visual Question Answering）数据集。

## 功能特点

- 上传并解析JSON格式的VQA数据集
- 可视化展示问题、图像和答案
- 支持按Subject、Category和Type进行筛选
- 问题一键复制功能
- 图像所在目录一键打开功能
- 支持分页浏览
- 响应式设计，适配不同设备

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动应用

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

应用将在 http://localhost:8000 上运行。

## 使用方法

1. 打开浏览器访问 http://localhost:8000
2. 点击"选择JSON文件"按钮，上传符合格式的VQA数据集文件
3. 上传成功后，数据将自动加载并显示
4. 使用左侧筛选面板根据Subject、Category和Type筛选数据
5. 点击问题旁的"复制"按钮可以复制问题文本
6. 点击图像右上角的文件夹图标可以打开图像所在目录

## 数据格式要求

上传的JSON文件应为数组格式，每个元素为一个对象，包含以下字段：

```json
{
  "pid": 0,
  "raw_id": 0,
  "question": "问题文本",
  "query": "查询文本",
  "answer": "答案",
  "image": "images/0.jpg",
  "subject": "学科",
  "category": "类别",
  "source": "数据来源",
  "type": "问题类型"
}
```

## 注意事项

- 图像路径应为相对于项目根目录的相对路径
- 确保应用有权限访问图像文件
- 为了获得最佳性能，建议数据集大小不要超过10000条记录 