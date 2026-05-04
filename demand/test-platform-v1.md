# 自动化测试平台基础需求文档

## 需求概述
实现一个自动化的测试平台，具备基本的测试用例录入、测试用例执行、查看已有用例、查看已有测试脚本的功能

## 需求详情

### 测试用例部分
1. 自动化的测试平台支持用户手动创建用例，也支持通过指定的excel格式导入测试用例
2. 支持测试用例的分组，通过目录实现，相同项目下的测试用例可以建在同一个目录下，项目目录下又能创建小组目录，小组目录下又能创建需求目录，以此类推，参考：
```text
root
|-{项目1}
|-- {小组1}
|---{需求1}
```
3. 录入的测试用例支持编辑、删除

### 测试接口部分
1. 支持从页面录入接口，接口信息包括接口地址，接口协议，接口协议通过json或者yaml格式的openAI标准接口定义录入，示例：
```yaml
openapi: 3.0.1
info:
  title: 待办事项 API
  description: 一个用于管理待办事项的 API
  version: 'v1'
servers:
  - url: https://your-api-domain.com  # 请替换为你的真实 API 地址
paths:
  /todos:
    get:
      operationId: getTodos       # 唯一标识，供模型调用
      summary: 获取所有待办事项
      responses:
        "200":
          description: 成功获取列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  todos:
                    type: array
                    items:
                      type: string
```
也支持通过页面录入的形式录入接口，包括接口地址和接口参数
```text
参数名称      参数类型       参数说明       是否必填       参数位置
username     string       用户名         true          body
```
特殊说明：
- 参数名称只能由大小写英文字母、下划线、0-9数字组成
- 参数类型取值范围
    - `string`
    - `bool`
    - `int`
    - `long`
    - `float`
    - `object`
    - `array<string>`
    - `array<int>`
    - `array<long>`
    - `array<float>`
    - `array<object>`
- 参数位置包括：body(请求体)、header(请求头)
> 后续支持扩展
2. 录入的接口信息支持调试、编辑、删除

### 测试脚本部分
1. 支持用户上传自己的测试脚本(暂时可以只支持go语言和python语言的测试脚本)，测试脚本保存的方式与测试用例相同
2. 测试脚本上传之后支持在线调试，在线修改
2. 自动化执行，点击执行之后，如果用户已经上传了测试用例和测试脚本，则根据测试用例自动执行，并最终生成测试结果

### 测试报告部分
1. 测试报告生成之后支持用户进行下载
