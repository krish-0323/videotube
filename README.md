# **Videotube**

## **Overview**  
**Videotube** is a backend project designed as a clone of YouTube. The project emphasizes writing production-level code with secured routes and testing functionalities using Postman and MongoDB. This system incorporates a robust database structure, user authentication, and file handling capabilities, providing a solid foundation for a scalable video-sharing platform.

---

## **Features**  
- **Structured Database**: Organized and efficient database schema implemented using MongoDB.  
- **User Authentication**: Secure login and registration functionalities for users.  
- **Postman Testing**: Comprehensive API testing performed with Postman to ensure reliability.  
- **Standardized Responses**: Unified server responses for both successful and error cases.  
- **File Handling**: Integrated support for managing and storing files via Cloudinary.

---

## **Technology Stack**  
- **Backend**: Node.js, Express.js  
- **Database**: MongoDB  
- **API Testing**: Postman  
- **Cloud Services**: Cloudinary  

---

## **Installation Steps**  
Follow these steps to set up and run the project locally:  

1. **Clone the Repository**  
   ```bash
   git clone <repository_url>
   cd videotube
   ```

2. **Install Dependencies**  
   ```bash
   npm install
   ```

3. **Configure Environment Variables**  
   Create a `.env` file in the root directory and add the following variables:  
   ```
   MONGODB_URI=<>
   CORS_ORIGIN=<>
   ACCESS_TOKEN_SECRET=<>
   ACCESS_TOKEN_EXPIRY=<>
   REFRESH_TOKEN_SECRET=<>
   REFRESH_TOKEN_EXPIRY=<>
   CLOUDINARY_CLOUD_NAME=<>
   CLOUDINARY_API_KEY=<>
   CLOUDINARY_API_SECRET=<>
   
   ```

4. **Run the Server**  
   ```bash
   npm start
   ```

5. **Test the APIs**  
   Use Postman to test various endpoints and functionalities.

---

## **Usage**  
1. **Authentication**:  
   - Register new users using the `/register` endpoint.  
   - Log in users using the `/login` endpoint.  

2. **File Handling**:  
   - Upload and manage video files using Cloudinary integration.  

3. **API Testing**:  
   - Verify the functionality of various endpoints using Postman.  

---

## **Future Enhancements**  
- Add video streaming and playback functionality.  
- Implement user subscriptions and notifications.  
- Integrate frontend for a complete YouTube clone experience.  

---
