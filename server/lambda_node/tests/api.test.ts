import {describe, expect, it, jest } from '@jest/globals';
import { PrimaryRouter } from '../api';
import { GenericRouter, LambdaResponse, UserAuthorizationContext } from '../layers/common';
import { OK_MODEL } from '../layers/common/utils/constants';


class MockSecondaryRouter_Key implements GenericRouter {
    mockFunction: (...args: unknown[]) => unknown;
    constructor(mockFunction: (...args: unknown[])=>unknown) {
        this.mockFunction = mockFunction;
    }
    async routeRequest(pathParts: string[], body: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        this.mockFunction("key");
        this.mockFunction(pathParts, body, authorizer) as Promise<LambdaResponse>;
        return OK_MODEL;
    }
}

class MockSecondaryRouter_Session implements GenericRouter {
    mockFunction: (...args: unknown[]) => unknown;
    constructor(mockFunction: (...args: unknown[])=>unknown) {
        this.mockFunction = mockFunction;
    }
    async routeRequest(pathParts: string[], body: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        this.mockFunction("session");
        this.mockFunction(pathParts, body, authorizer) as Promise<LambdaResponse>;
        return OK_MODEL;
    }
}

class MockSecondaryRouter_User implements GenericRouter {
    mockFunction: (...args: unknown[]) => unknown;
    constructor(mockFunction: (...args: unknown[])=>unknown) {
        this.mockFunction = mockFunction;
    }
    async routeRequest(pathParts: string[], body: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        this.mockFunction("user");
        this.mockFunction(pathParts, body, authorizer) as Promise<LambdaResponse>;
        return OK_MODEL;
    }
}


describe('primaryRouter route request with unknown route', function () {
    it("returns error as expected",
      async () => {
        expect.assertions(1);
        const nullRequestRouter = new PrimaryRouter(null, null, null);
        
        const pathFail = ["poop", "hi"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: poop/hi\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(nullRequestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });
});

describe('request parser parse request', function () {
    it.skip("fails with invalid json",
      async () => {
        expect.assertions(1);
        const nullRequestRouter = new PrimaryRouter(null, null, null);
        
        const pathFail = ["poop", "hi"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: poop/hi\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(nullRequestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });

    it.skip("successfully parses json and path",
      async () => {
        expect.assertions(1);
        const nullRequestRouter = new PrimaryRouter(null, null, null);
        
        const pathFail = ["poop", "hi"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: poop/hi\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(nullRequestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });
});


describe('routeRequest to key', function () {
    it.skip("route successfully",
        async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return 0;
            })
            const mockKeyRepository = new MockSecondaryRouter_Key(mockCreationFunction)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const router = new PrimaryRouter(null, mockKeyRepository, null)

            expect(mockCreationFunction).toBeCalledTimes(2);
            expect(mockCreationFunction).toBeCalledWith("createKey");
        }
    );
});


describe('routeRequest to user', function () {
    it.skip("route successfully to user",
        async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return 0
            })
            const mockUserRepository = new MockSecondaryRouter_User(mockCreationFunction)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const router = new PrimaryRouter(mockUserRepository, null, null)

            expect(mockCreationFunction).toBeCalledTimes(2);
            expect(mockCreationFunction).toBeCalledWith("createKey");
        }
    );
});

describe('routeRequest to session', function () {
    it.skip("route successfully",
            async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return 0
            })
            const mockSessionRepository = new MockSecondaryRouter_Session(mockCreationFunction)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const router = new PrimaryRouter(null, null, mockSessionRepository)


            expect(mockCreationFunction).toBeCalledTimes(2);
            expect(mockCreationFunction).toBeCalledWith("createKey");
        }
    );
});