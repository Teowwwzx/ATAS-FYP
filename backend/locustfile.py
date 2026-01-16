from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5) # 模拟用户思考时间

    @task
    def view_profile(self):
        # 假设你已经登录拿到了 token，或者测试一个公开接口
        # 这里简单测试一下不需要登录的接口，或者你自己把 Header 加上
        self.client.get("/api/v1/profiles/some-uuid-here")