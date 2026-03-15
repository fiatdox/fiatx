export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* Image Section (50%) - Hidden on mobile, visible on medium screens and up */}
      <div className="relative hidden w-full md:block md:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1616243850909-f010afe8de3a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Ministry Background"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Optional overlay to blend slightly with the theme */}
        <div className="absolute inset-0 bg-[#006a5a]/10 mix-blend-multiply" />
      </div>

      {/* Login Form Section (50%) */}
      <div className="flex flex-1 w-full flex-col justify-center bg-white px-4 py-12 md:w-1/2 md:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-[#006a5a]">
              เข้าสู่ระบบ
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              ระบบบริหารจัดการ (Ministry Portal)
            </p>
          </div>

          <form className="mt-8 space-y-6" action="#" method="POST">
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">
                  ชื่อผู้ใช้งาน
                </label>
                <div className="mt-2">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#006a5a] sm:text-sm sm:leading-6 px-3"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  รหัสผ่าน
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#006a5a] sm:text-sm sm:leading-6 px-3"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#006a5a] focus:ring-[#006a5a]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  จดจำฉัน
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-[#006a5a] hover:text-[#00554a]">
                  ลืมรหัสผ่าน?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-[#006a5a] px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[#00554a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006a5a]"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
