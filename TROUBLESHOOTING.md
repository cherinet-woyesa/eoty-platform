# EOTY Platform Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the EOTY Platform deployment.

## Common Deployment Issues

### 1. Slow Loading Times

#### Symptoms:
- Pages take longer than expected to load
- Videos buffer frequently
- API requests timeout

#### Diagnosis:
1. Check server logs for errors or warnings
2. Monitor resource usage (CPU, memory, disk I/O)
3. Test database query performance
4. Verify network connectivity

#### Solutions:
1. **Database Optimization**:
   - Add indexes to frequently queried columns
   - Optimize slow queries
   - Consider database connection pooling

2. **Caching**:
   - Implement Redis caching for frequently accessed data
   - Use CDN for static assets
   - Enable browser caching

3. **Video Optimization**:
   - Use Mux for video processing and adaptive streaming
   - Ensure videos are properly encoded
   - Check CDN configuration for video assets

4. **Server Resources**:
   - Upgrade server plan if resource usage is high
   - Implement load balancing for high traffic

### 2. Features Not Working

#### Symptoms:
- Specific features return errors
- Buttons or links don't respond
- Forms fail to submit

#### Diagnosis:
1. Check browser console for JavaScript errors
2. Verify API endpoints are returning correct responses
3. Check CORS configuration
4. Review server logs for specific error messages

#### Solutions:
1. **Frontend Issues**:
   - Clear browser cache and cookies
   - Check browser compatibility
   - Verify all required environment variables are set

2. **Backend Issues**:
   - Ensure all required services are running
   - Check database connectivity
   - Verify API keys and credentials

3. **Integration Issues**:
   - Test third-party service connectivity
   - Check webhook configurations
   - Verify callback URLs

### 3. Video Processing Problems

#### Symptoms:
- Videos fail to upload
- Videos don't process or remain in "processing" state
- Videos don't play or show errors

#### Diagnosis:
1. Check Mux dashboard for processing errors
2. Verify AWS S3 configuration
3. Review video upload logs
4. Test video file compatibility

#### Solutions:
1. **Mux Configuration**:
   - Verify Mux credentials are correct
   - Check webhook configuration
   - Review Mux documentation for error codes

2. **File Issues**:
   - Ensure videos are in supported formats (MP4, WebM, MOV)
   - Check file size limits
   - Verify file integrity

3. **Storage Issues**:
   - Check AWS S3 bucket permissions
   - Verify CloudFront distribution
   - Test direct S3 access

### 4. Authentication Problems

#### Symptoms:
- Unable to login or register
- Session expires unexpectedly
- Access denied errors

#### Diagnosis:
1. Check JWT configuration
2. Verify database user records
3. Review OAuth configuration
4. Test authentication endpoints

#### Solutions:
1. **JWT Issues**:
   - Ensure JWT_SECRET is properly set
   - Check token expiration settings
   - Verify token signing algorithm

2. **Database Issues**:
   - Check user table for correct data
   - Verify password hashing
   - Test database connectivity

3. **OAuth Issues**:
   - Verify Google OAuth credentials
   - Check redirect URLs
   - Test OAuth flow manually

## Specific Error Solutions

### CORS Errors
```
Access to fetch at 'https://api.example.com' from origin 'https://your-site.com' has been blocked by CORS policy
```

**Solution**:
1. Update CORS configuration in `backend/app.js`
2. Add your frontend domain to allowed origins
3. Verify CORS headers in API responses

### Database Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
1. Verify database credentials in environment variables
2. Check if database service is running
3. Test database connectivity with a database client
4. Verify network access to database server

### Video Upload Errors
```
Video upload failed: Request failed with status code 413
```

**Solution**:
1. Increase file size limits in backend configuration
2. Check nginx or proxy server file size limits
3. Verify available disk space
4. Test with smaller video files

### Mux Webhook Errors
```
Webhook verification failed
```

**Solution**:
1. Verify MUX_WEBHOOK_SECRET matches Mux dashboard
2. Check webhook URL in Mux dashboard
3. Ensure webhook endpoint is publicly accessible
4. Test webhook with Mux testing tools

## Performance Monitoring

### Tools to Use:
1. **Application Performance Monitoring (APM)**:
   - New Relic
   - Datadog
   - Prometheus + Grafana

2. **Database Monitoring**:
   - pg_stat_statements for PostgreSQL
   - Database query analyzers

3. **Frontend Monitoring**:
   - Google Lighthouse
   - WebPageTest
   - Browser developer tools

### Key Metrics to Monitor:
1. Response times for API endpoints
2. Database query performance
3. Server resource usage
4. Error rates
5. User experience metrics

## Logging and Debugging

### Enable Detailed Logging:
1. Set `DEBUG=*` environment variable
2. Check application logs in deployment platform
3. Use structured logging for better analysis
4. Implement log aggregation for distributed systems

### Debugging Steps:
1. Reproduce the issue in a development environment
2. Use debugging tools (Node.js debugger, browser dev tools)
3. Add additional logging to problematic areas
4. Check third-party service status pages

## Support Resources

If you're unable to resolve an issue:

1. Check the [GitHub Issues](https://github.com/your-repo/issues) for known issues
2. Review the [Documentation](README.md) and [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
3. Contact support with:
   - Detailed error messages
   - Steps to reproduce
   - Environment information
   - Recent changes made