from fastapi import APIRouter, Request, Form
from fastapi.responses import JSONResponse, FileResponse
import json
import os
from pathlib import Path

router = APIRouter(
    prefix="/api",
    tags=["vqa"],
)

# 存储当前加载的图像根目录
current_image_dir = ""

@router.get("/load_local_file")
async def load_local_file(file_path: str):
    """
    从服务器本地路径加载JSON文件
    """
    global current_image_dir
    
    try:
        # 确保文件存在
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"message": "文件不存在"})
        
        # 获取文件所在目录作为图像根目录
        image_root_dir = os.path.dirname(os.path.abspath(file_path))
        current_image_dir = image_root_dir  # 保存当前图像目录
        
        # 读取并解析JSON文件
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # 验证数据格式
        if not isinstance(data, list):
            return JSONResponse(status_code=400, content={"message": "数据格式不正确，应为JSON数组"})
        
        # 为每个数据项的图像路径添加前缀，使其指向我们的API
        for item in data:
            if "image" in item:
                # 获取相对路径
                rel_path = item["image"]
                if not (rel_path.startswith('/') or rel_path.startswith(('C:', 'D:', 'E:'))):
                    # 将路径转换为API路径
                    item["image"] = f"/api/image?path={rel_path}"
        
        # 提取所有可能的分类
        subjects = list(set(item.get("subject", "") for item in data if "subject" in item))
        categories = list(set(item.get("category", "") for item in data if "category" in item))
        types = list(set(item.get("type", "") for item in data if "type" in item))
        
        return {
            "data": data,
            "meta": {
                "total": len(data),
                "subjects": subjects,
                "categories": categories,
                "types": types,
                "image_root_dir": image_root_dir  # 添加图像根目录信息
            }
        }
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"message": "无效的JSON文件"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"处理文件时出错: {str(e)}"})

@router.get("/image")
async def get_image(path: str):
    """
    提供图像文件
    """
    global current_image_dir
    
    try:
        # 构建完整的图像路径
        full_path = os.path.join(current_image_dir, path)
        
        # 确保文件存在
        if not os.path.exists(full_path):
            return JSONResponse(status_code=404, content={"message": "图像文件不存在"})
        
        # 返回图像文件
        return FileResponse(full_path)
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"获取图像出错: {str(e)}"})

@router.post("/open_image_folder")
async def open_image_folder(image_path: str = Form(...)):
    """
    打开图像所在的文件夹
    """
    try:
        # 获取图像所在目录
        # 如果是API路径，需要提取实际路径
        if image_path.startswith("/api/image?path="):
            # 提取查询参数中的路径
            path = image_path.replace("/api/image?path=", "")
            image_dir = os.path.dirname(os.path.join(current_image_dir, path))
        else:
            image_dir = os.path.dirname(image_path)
            
        # 确保路径存在
        if not os.path.exists(image_dir):
            return JSONResponse(status_code=404, content={"message": "图像目录不存在"})
        
        # 使用系统命令打开文件夹
        if os.name == 'nt':  # Windows
            os.system(f'explorer "{image_dir}"')
        elif os.name == 'posix':  # Linux/Mac
            os.system(f'xdg-open "{image_dir}"')
        
        return {"success": True, "message": "已打开图像目录"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"打开图像目录时出错: {str(e)}"}) 