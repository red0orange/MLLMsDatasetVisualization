from fastapi import APIRouter, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
import json
import os
from pathlib import Path
import shutil

router = APIRouter(
    prefix="/api",
    tags=["vqa"],
)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    上传并解析JSON文件
    """
    # 保存上传的文件到临时目录
    temp_file = f"temp_{file.filename}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 解析JSON文件
    try:
        with open(temp_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        os.remove(temp_file)  # 删除临时文件
        
        # 验证数据格式
        if not isinstance(data, list):
            return JSONResponse(status_code=400, content={"message": "数据格式不正确，应为JSON数组"})
        
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
                "types": types
            }
        }
    except json.JSONDecodeError:
        os.remove(temp_file)  # 删除临时文件
        return JSONResponse(status_code=400, content={"message": "无效的JSON文件"})
    except Exception as e:
        os.remove(temp_file)  # 删除临时文件
        return JSONResponse(status_code=500, content={"message": f"处理文件时出错: {str(e)}"})

@router.post("/open_image_folder")
async def open_image_folder(image_path: str = Form(...)):
    """
    打开图像所在的文件夹
    """
    try:
        # 获取图像所在目录
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

@router.get("/load_local_file")
async def load_local_file(file_path: str):
    """
    从服务器本地路径加载JSON文件
    """
    try:
        # 确保文件存在
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"message": "文件不存在"})
        
        # 读取并解析JSON文件
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # 验证数据格式
        if not isinstance(data, list):
            return JSONResponse(status_code=400, content={"message": "数据格式不正确，应为JSON数组"})
        
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
                "types": types
            }
        }
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"message": "无效的JSON文件"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"处理文件时出错: {str(e)}"}) 