import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import keyAccess from "./../layers/db_access/keyAccess";
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
  AttributeValue,
  TableAlreadyExistsException,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  unmarshall
} from "@aws-sdk/util-dynamodb";
import { FrontendKey, KeyContext } from '../layers/model/keys';
import { DatabaseKey, DatabaseUser } from '../layers/db_access/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from './testDatabaseSetup';
import { TABLE_NAME } from '../layers/utils/constants';
import { getDatabaseKey, getFrontendKey } from '../layers/db_access/mapping';

let config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
let documentClient = DynamoDBDocumentClient.from(new DynamoDBClient(config));
let testDataModel = loadTestData('./tests/testData/AutoAuthenticateDatabase.json');
let validUsers: Array<DatabaseUser> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined == "M#")
let validKeys: Array<DatabaseKey> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined.startsWith("K#"))


beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('createKey', function () {
    it("Creates key successfully",
      async () => {
        expect.assertions(3);

        // Get valid inputKey
        let userEmail = "msd@gemail.com"
        let inputKey: FrontendKey = {
          key: "23948fsdkf",
          id: "203974fjsldf",
          context: {
              Name: "testKey",
              Site: "newste",
              CreationDate: new Date().getTime()
           },
          useCounter: 0,
          lastContentUpdate: new Date()
        };
        // Assert that they key creation functino returns input key
        await expect(keyAccess.createKey(userEmail, inputKey, documentClient))
            .resolves.toStrictEqual(inputKey);

        // Assert that the key can be found in the database
        await expect(documentClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + inputKey.id
            }
        })).then(it => {
          return it.Item
        })).resolves.toStrictEqual(getDatabaseKey(userEmail, inputKey));

        // Assert that we can delete the new key
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + inputKey.id
              }
            })
          )
        ).resolves.toBeTruthy();
      }
    );
});


describe('getKeysSinceTime', function () {
  it("Gets all keys successfully for a user who has at least two keys",
    async () => {
      expect.assertions(1);
      
      let userWithTwoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      let usersKeys: Array<FrontendKey> = validKeys.filter(key => {
        return key.PKCombined == userWithTwoKeys.PKCombined
      }).map(key => {
        return getFrontendKey(key);
      });
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoKeys.PKCombined, undefined,  documentClient
      )).resolves.toStrictEqual(usersKeys);
    }
  );

  it("Gets all keys successfully for a user who has no keys",
    async () => {
      expect.assertions(1);
      
      let userWithNoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.find(key => {
          return key.PKCombined == user.PKCombined
        }) === undefined;
      });
      await expect(keyAccess.getKeysSinceTime(
        userWithNoKeys.PKCombined, undefined, documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it("Get 0 keys for a user with 2 keys filtered by time",
    async () => {
      expect.assertions(1);
      let userWithTwoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoKeys.PKCombined, new Date(8640000000000000), documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it("Get 1 keys for a user with at least 2 keys filtered by time",
    async () => {
      expect.assertions(2);
      let userWithTwoOrMoreKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      let usersKeys: Array<DatabaseKey> = validKeys.filter(key => {
        return key.PKCombined == userWithTwoOrMoreKeys.PKCombined
      });
      let inBetweenTime = usersKeys.reduce(function (accumulator, currentValue) {
        return accumulator + currentValue.temporal / 1000
      }, 0) / usersKeys.length * 1000;
      let expectedKeys = usersKeys.filter(key => {
        return key.temporal > inBetweenTime
      }).map(key => {
        return getFrontendKey(key)
      });

      expect(expectedKeys.length).toBeLessThan(usersKeys.length);
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoOrMoreKeys.PKCombined, new Date(inBetweenTime), documentClient
      )).resolves.toStrictEqual(expectedKeys);
    }
  );
});

describe('deleteKey', function () {
  it("Deletes key successfully",
    async () => {
      expect.assertions(4);
        // Get valid frontendUser
        let userEmail = validUsers[0].PKCombined;
        let databaseKey = getDatabaseKey(
          userEmail, 
          {
            lastContentUpdate: new Date(),
            useCounter: 0,
            context: {
              Name: "testSesh",
              Site: null,
              CreationDate: 10039430
            },
            key: "hehe3k23k",
            id: "flk2j32f"
          }
        );

        // First of all expect that the put command works
        await expect(documentClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: databaseKey
          })
        )).resolves.toBeTruthy();

        // Expect key to exist initially
        await expect(documentClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PKCombined: userEmail,
              SKCombined: databaseKey.SKCombined
            }
          })
        ).then(item => {
          return item.Item
        })).not.toBeUndefined();

        // // Expect delete key to resolve
        await expect(keyAccess.deleteKey(
          userEmail, databaseKey.SKCombined.slice(2), documentClient)
        ).resolves.toBeUndefined()

        // Make sure the key does not exist anymore
        await expect(documentClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PKCombined: userEmail,
              SKCombined: databaseKey.SKCombined
            }
          })
        ).then(it => {
          return it.Item
        })).resolves.toBeUndefined();
      }
    );
});

describe('getAndIncrement', function () {
  it("Gets and increments key counter",
    async () => {
      expect.assertions(3);
      
      let incrementedKey = validKeys[0];
      let newKey = getFrontendKey(incrementedKey);
      newKey.useCounter = newKey.useCounter + 1;
      let newDatabaseKey = getDatabaseKey(incrementedKey.PKCombined, newKey)

      // Assert that the increment function returns well
      await expect(keyAccess.getAndIncrement(
        incrementedKey.PKCombined, incrementedKey.SKCombined.slice(2), documentClient
      )).resolves.toStrictEqual(
        newKey
      );

      // Assert that the key is really changed in the database
      await expect(documentClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PKCombined: incrementedKey.PKCombined,
          SKCombined: incrementedKey.SKCombined
        }
      })).then(item => {
        return item.Item;
      })).resolves.toEqual(newDatabaseKey)

      // Assert that we can put the key back to its original state (dont want tests to change database)
      await expect(documentClient.send( new PutCommand({
        TableName: TABLE_NAME,
        Item: incrementedKey
      }))).resolves.toBeTruthy();
    }
  );
})

describe('updateKeyContext', function () {
  it("Updates key context successfully",
    async () => {
      expect.assertions(2);

      let validKey: DatabaseKey = validKeys[0];
      let newKeyContext: KeyContext = {
        Name: "New name",
        Content: "new content",
        CreationDate: 222,
        Site: null,
      }
      let newKey = getFrontendKey(validKey) as any;
      newKey.lastContentUpdate = expect.any(Date);
      newKey.context = expect.objectContaining(newKeyContext);

      await expect(keyAccess.updateKeyContext(
        validKey.PKCombined, validKey.SKCombined.slice(2), newKeyContext, documentClient
      )).resolves.toEqual(
        newKey
      );

      await expect(
        documentClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            SKCombined: validKey.SKCombined,
            PKCombined: validKey.PKCombined
          }
        })).then(result => {
          return getFrontendKey(result.Item as DatabaseKey)
        })
      ).resolves.toEqual(
        newKey
      )
    }
  );
});
